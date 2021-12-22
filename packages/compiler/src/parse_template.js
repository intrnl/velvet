import * as p from './utils/template_parser.js';
import * as t from './utils/template_types.js';
import * as j from './utils/js_parse.js';


export function parse_template (content) {
	let state = p.create_state(content);

	let parser = _parse_fragment;

	while (state.index < state.content.length) {
		parser = parser(state) || _parse_fragment;
	}

	if (state.stack.length > 1) {
		throw p.error(state, 'unexpected end of input');
	}

	return p.current(state);
}

/**
 * @param {p.ParserState} state
 */
function _parse_fragment (state) {
	let char = state.content[state.index];

	if (char === '<') {
		return _parse_element;
	}

	if (char === '{') {
		return _parse_expression;
	}

	return _parse_text;
}

/**
 * @param {p.ParserState} state
 */
function _parse_text (state) {
	let start = state.index;
	let raw = '';

	for (; state.index < state.content.length; state.index++) {
		let char = state.content[state.index];

		if (char === '<' || char === '{') {
			break;
		}

		raw += char;
	}

	let node = t.text(raw);
	node.start = start;
	node.end = state.index;

	p.current(state).children.push(node);
}

/**
 * @param {p.ParserState} state
 */
function _parse_expression (state) {
	let start = state.index;

	p.eat(state, '{', 'opening expression bracket');

	// opening logic block
	if (p.eat(state, '#')) {
		if (p.eat(state, 'if')) {
			p.eat_whitespace(state, true);

			let test = _read_expression(state);

			p.eat_whitespace(state);
			p.eat(state, '}', 'closing #if bracket');

			let consequent = t.fragment();
			let node = t.conditional_statement(test, consequent);

			p.current(state).children.push(node);
			p.push(state, node, consequent);
			return;
		}

		if (p.eat(state, 'each')) {
			p.eat_whitespace(state, true);

			let local = _read_expression(state);

			if (!_is_expression_pattern(local)) {
				throw p.error(state, 'expected an assignment');
			}

			p.eat_whitespace(state, true);

			let enumerable = p.eat(state, 'in');
			if (!enumerable) p.eat(state, 'of', 'either in or of');

			p.eat_whitespace(state, true);

			let expression = _read_expression(state);

			p.eat_whitespace(state);
			p.eat(state, '}', 'closing #each bracket');

			let kind = enumerable ? 'enumerable' : 'iterable';

			let body = t.fragment();
			let node = t.loop_statement(kind, expression, local, body);

			p.current(state).children.push(node);
			p.push(state, node, body);
			return;
		}

		if (p.eat(state, 'await')) {
			p.eat_whitespace(state, true);

			let argument = _read_expression(state);

			p.eat_whitespace(state);

			let to_resolve = p.eat(state, 'then');
			if (to_resolve) p.eat_whitespace(state);

			p.eat(state, '}', 'closing #await bracket');

			let block = t.fragment();
			let node = t.await_statement(argument,!to_resolve ? block : null, to_resolve ? block : null);

			p.current(state).children.push(node);
			p.push(state, node, body);
			return;
		}

		throw p.error(state, 'unknown logic block opening');
	}

	// closing logic block
	if (p.eat(state, '/')) {
		let statement = p.current(state, 1);
		let expected;

		if (!statement) {
			throw p.error(state, 'unexpected logic block closing');
		}

		if (statement.type === 'ConditionalStatement') {
			expected = 'if';

			// 0 = Fragment
			// 1 = ConditionalStatement
			// 2 = ConditionalStatement?
			while (p.current(state, 1) === p.current(state, 2)?.alternate) {
				p.pop(state, 1);
			}
		}
		else if (statement.type === 'LoopStatement') {
			expected = 'each';
		}
		else if (statement.type === 'AwaitStatement') {
			expected = 'await';
		}
		else {
			throw p.error(state, 'unexpected logic block closing');
		}

		p.eat(state, expected, `closing /${expected} block`);
		p.eat_whitespace(state);
		p.eat(state, '}', `closing /${expected} bracket`);

		p.pop(state, 2);
		return;
	}

	// intermediary logic
	if (p.eat(state, ':else')) {
		let statement = p.current(state, 1);

		if (!statement) {
			throw p.error(state, 'unexpected usage of :else outside of #if and #each');
		}

		if (statement.type === 'ConditionalStatement') {
			let additional = p.eat_whitespace(state) && p.eat(state, 'if');

			if (additional) {
				p.eat_whitespace(state, true);

				let test = _read_expression(state);
				p.eat_whitespace(state);

				let block = t.fragment();
				let node = t.conditional_statement(test, block);

				statement.alternate = node;

				p.pop(state, 1);
				p.push(state, node, block);
			}
			else {
				let block = t.fragment();

				statement.alternate = block;

				p.pop(state, 1);
				p.push(state, block);
			}

			p.eat(state, '}', 'closing :else bracket');
			return;
		}

		if (statement.type === 'LoopStatement') {
			if (statement.alternate) {
				throw p.error(state, 'only one :else can be defined for #each');
			}

			p.eat_whitespace(state);

			let block = t.fragment();

			statement.alternate = block;

			p.pop(state, 1);
			p.push(state, block);

			p.eat(state, '}', 'closing :else bracket');
			return;
		}

		throw p.error(state, 'unexpected usage of :else outside of #if and #each');
	}

	let name = '';

	// named expression
	if (p.eat(state, '@')) {
		for (; state.index < state.content.length; state.index++) {
			let char = state.content[state.index];

			if (p.is_whitespace(char)) {
				break;
			}

			name += char;
		}

		if (!name) {
			throw p.error(state, 'expected a name for named expression');
		}
	}

	p.eat_whitespace(state);
	let expression = _read_expression(state);
	p.eat_whitespace(state);

	p.eat(state, '}', 'closing expression bracket');

	let node = name
		? t.named_expression(name, expression)
		: t.expression(expression);

	node.start = start;
	node.end = state.index;

	p.current(state).children.push(node);
}

/**
 * @param {p.ParserState} state
 */
function _parse_element (state) {
	p.eat(state, '<', 'opening tag bracket');

	throw p.error(state, 'unimplemented');
}

/**
 * @param {p.ParserState} state
 */
function _read_expression (state) {
	try {
		let node = j.parse_expression(state.content, state.index);

		let parens = 0;

		for (let index = state.index; index < node.start; index++) {
			if (state.content[index] === '(') {
				parens++;
			}
		}

		let index = node.end;

		for (; parens > 0; parens--) {
			let char = state.content[index];

			if (char === ')') {
				parens--;
			}
			else if (!p.is_whitespace(char)) {
				throw p.error(state, `expected closing parenthesis`, index);
			}

			index++;
		}

		state.index = index;
		return node;
	}
	catch (error) {
		throw p.error(state, `JS parsing error: ${error.message}`);
	}
}

/**
 * @param {import('estree').Expression} node
 * @returns {node is import('estree').Pattern}
 */
function _is_expression_pattern (node) {
	// we're parsing things as an expression here, so we'll have to check for
	// expression-equivalents of patterns.

	return (
		node.type === 'Identifier' ||
		node.type === 'ObjectPattern' || node.type === 'ObjectExpression' ||
		node.type === 'ArrayPattern' || node.type === 'ArrayExpression'
	);
}

let result = parse_template('{#if foo}1{:else if bar}2{:else if baz}3{:else}4{/if}');
console.dir(result, { depth: Infinity });
