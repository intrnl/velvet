import * as p from './utils/template_parser.js';
import * as t from './utils/template_types.js';
import * as j from './utils/js_parse.js';
import { is_void, closing_tag_omitted } from './utils/html.js';


export function parse_template (content) {
	let state = p.create_state(content);

	let parser = _parse_fragment;

	while (state.index < state.content.length) {
		parser = parser(state) || _parse_fragment;
	}

	if (state.stack.length > 1) {
		throw p.error(state, 'unexpected end of input');
	}

	/** @type {t.Fragment} */
	let root = p.current(state);

	root.start = root.children[0]?.start || 0;
	root.end = root.children[root.children.length - 1]?.end || 0;

	return root;
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
			node.start = start;

			p.current(state).children.push(node);
			p.push(state, node, consequent);
			return;
		}

		if (p.eat(state, 'each')) {
			p.eat_whitespace(state, true);

			let local = _read_expression(state);
			let local_index = null;

			if (local.type === 'Identifier') {
				// do nothing
			}
			else if (local.type === 'SequenceExpression') {
				let expressions = local.expressions;

				for (let index = 0; index < expressions.length; index++) {
					let expression = expressions[index];

					if (index === 0) {
						local = expression;
					}
					else if (index === 1) {
						local_index = expression;
					}
					else {
						let last = expressions[expressions.length - 1];

						throw {
							message: 'there can only be value and index',
							start: expression.start,
							end: last.end,
						};
					}

					if (expression.type !== 'Identifier') {
						throw {
							message: 'expected an identifier',
							start: expression.start,
							end: expression.end,
						};
					}
				}
			}
			else {
				throw {
					message: 'expected an identifier',
					start: local?.start || state.index,
					end: local?.end || state.index,
				};
			}

			p.eat_whitespace(state, true);
			p.eat(state, 'of', true);
			p.eat_whitespace(state, true);

			let expression = _read_expression(state);

			p.eat_whitespace(state);
			p.eat(state, '}', 'closing #each bracket');

			let body = t.fragment();
			let node = t.loop_statement(expression, local, local_index, body);
			node.start = start;

			p.current(state).children.push(node);
			p.push(state, node, body);
			return;
		}

		if (p.eat(state, 'await')) {
			p.eat_whitespace(state, true);

			let argument = _read_expression(state);

			p.eat_whitespace(state);

			let to_resolve = p.eat(state, 'then');
			let to_reject = !to_resolve && p.eat(state, 'catch');
			p.eat_whitespace(state);

			let local = null;

			if ((to_resolve || to_reject) && !p.match(state, '}')) {
				local = p.eat_identifier(state);

				if (!local) {
					throw p.error(state, 'expected an identifier');
				}

				p.eat_whitespace(state);
			}

			p.eat(state, '}', 'closing #await bracket');

			let block = t.fragment();
			let clause = t.await_clause(local, block);

			let node = t.await_statement(
				argument,
				!to_resolve && !to_reject ? block : null,
				to_resolve ? clause : null,
				to_reject ? clause : null,
			);

			node.start = start;

			p.current(state).children.push(node);
			p.push(state, node, block);
			return;
		}

		throw p.error(state, 'unknown logic block opening');
	}

	// closing logic block
	if (p.eat(state, '/')) {
		let statement = p.current(state, 1);
		let block = p.current(state);
		let expected;

		if (!statement) {
			throw p.error(state, 'unexpected logic block closing');
		}

		if (statement.type === 'ConditionalStatement') {
			expected = 'if';
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

		block.start = block.children[0]?.start || statement.start;
		block.end = block.children[block.children.length - 1]?.end || statement.start;
		statement.end = state.index;

		if (statement.type === 'ConditionalStatement') {
			// 0 = Fragment
			// 1 = ConditionalStatement
			// 2 = ConditionalStatement?
			while (p.current(state, 1) === p.current(state, 2)?.alternate) {
				let statement = p.current(state, 2);
				statement.end = state.index;

				p.pop(state, 1);
			}
		}

		p.pop(state, 2);
		return;
	}

	// intermediary logic
	if (p.eat(state, ':else')) {
		let statement = p.current(state, 1);
		let prev_block = p.current(state);

		if (!statement) {
			throw p.error(state, 'unexpected usage of :else outside of #if and #each');
		}

		prev_block.start = prev_block.children[0]?.start || statement.start;
		prev_block.end = prev_block.children[prev_block.children.length - 1]?.end || statement.start;

		if (statement.type === 'ConditionalStatement') {
			let additional = p.eat_whitespace(state) && p.eat(state, 'if');

			if (additional) {
				p.eat_whitespace(state, true);

				let test = _read_expression(state);
				p.eat_whitespace(state);

				let block = t.fragment();
				let node = t.conditional_statement(test, block);
				node.start = start;

				statement.alternate = node;

				p.pop(state, 1);
				p.push(state, node, block);
			}
			else if (statement.alternate) {
				throw p.error(state, 'only one :else can be defined');
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

		throw p.error(state, 'unexpected usage of :else outside of #if');
	}

	if (p.eat(state, ':then')) {
		let statement = p.current(state, 1);

		if (statement?.type !== 'AwaitStatement') {
			throw p.error(state, 'unexpected usage of :then outside of #await');
		}

		if (statement.resolved) {
			throw p.error(state, 'only one :then can be defined');
		}

		if (statement.rejected) {
			throw p.error(state, 'cannot have :then after :catch');
		}

		let has_whitespace = p.eat_whitespace(state);
		let has_expression = !p.eat(state, '}');
		let expression = null;

		if (has_expression) {
			if (!has_whitespace) {
				throw p.error(state, 'expected whitespace');
			}

			expression = p.eat_identifier(state);

			if (!expression) {
				throw p.error(state, 'expected an identifier');
			}

			p.eat_whitespace(state);
			p.eat(state, '}', 'closing :then bracket');
		}

		let block = t.fragment();
		let node = t.await_clause(expression, block);

		statement.resolved = node;

		p.pop(state, 1);
		p.push(state, block);
		return;
	}

	if (p.eat(state, ':catch')) {
		let statement = p.current(state, 1);

		if (statement?.type !== 'AwaitStatement') {
			throw p.error(state, 'unexpected usage of :catch outside of #await');
		}

		if (statement.rejected) {
			throw p.error(state, 'only one :catch can be defined');
		}

		let has_whitespace = p.eat_whitespace(state);
		let has_expression = !p.eat(state, '}');
		let expression = null;

		if (has_expression) {
			if (!has_whitespace) {
				throw p.error(state, 'expected whitespace');
			}

			expression = p.eat_identifier(state);

			if (!expression) {
				throw p.error(state, 'expected an identifier');
			}

			p.eat_whitespace(state);
			p.eat(state, '}', 'closing :catch bracket');
		}

		let block = t.fragment();
		let node = t.await_clause(expression, block);

		statement.rejected = node;

		p.pop(state, 1);
		p.push(state, block);
		return;
	}

	// named expression
	let id = null;

	if (p.eat(state, '@')) {
		id = p.eat_identifier(state);

		if (!id) {
			throw p.error(state, 'expected an identifier');
		}

		p.eat_whitespace(state, true);
	}

	p.eat_whitespace(state);
	let expression = _read_expression(state);
	p.eat_whitespace(state);

	p.eat(state, '}', 'closing expression bracket');

	let node = t.expression(expression, id);

	node.start = start;
	node.end = state.index;

	p.current(state).children.push(node);
}

/**
 * @param {p.ParserState} state
 */
function _parse_element (state) {
	let start = state.index;
	let parent = p.current(state);

	p.eat(state, '<', 'opening tag bracket');

	// comment
	if (p.eat(state, '!--')) {
		let data = p.eat_until(state, /-->/g);
		p.eat(state, '-->', 'closing comment');

		let node = t.comment(data);
		node.start = start;
		node.end = state.index;

		parent.children.push(node);
		return;
	}

	let is_closing = p.eat(state, '/');
	let name = p.eat_until(state, /[\s>]/g);

	if (name === 'v:self') {
		// check for recursion
		let legal = false;

		for (let index = state.stack.length - 1; index >= 0; index--) {
			let node = state.stack[index];

			if (
				(node.type === 'Element' && node.component) ||
				node.type === 'ConditionalStatement' ||
				node.type === 'LoopStatement'
			) {
				legal = true;
				break;
			}
		}

		if (!legal) {
			throw p.error(state, 'v:self placement causes infinite recursion');
		}
	}
	else if (name === 'v:component') {
		// left blank
	}
	else if (name[0] === 'v' && name[1] === ':') {
		throw p.error(state, 'unknown special element');
	}

	if (is_closing) {
		if (is_void(name)) {
			throw p.error(state, `${tag} is a void element and cannot have a closing tag or children`);
		}

		p.eat_whitespace(state);
		p.eat(state, '>', 'closing tag bracket');

		while (parent.name !== name) {
			if (parent.type !== 'Element') {
				let message = state._last_auto_closed?.name === name
					? `</${name}> attempted to close <${name}> that were already closed by <${state._last_auto_closed.tag}>`
					: `</${name}> attempted to close an element that was not open`;

				throw p.error(state, message, start);
			}

			parent.end = start;
			p.pop(state);

			parent = p.current();
		}

		parent.end = state.index;
		p.pop(state);

		if (state._last_auto_closed && state.stack.length < state._last_auto_closed.depth) {
			state._last_auto_closed = null;
		}

		return;
	}
	else if (closing_tag_omitted(parent.name, name)) {
		parent.end = start;
		p.pop(state);

		state._last_auto_closed = {
			name: parent.name,
			tag: name,
			depth: state.stack.length,
		};
	}

	// attributes parsing
	let attributes = [];
	let attribute_names = new Set();

	if (p.eat_whitespace(state)) {
		while (state.content[state.index] !== '>') {
			let start = state.index;

			if (p.eat(state, '{')) {
				p.eat_whitespace(state);
				p.eat(state, '...', 'spread pattern');

				let expression = _read_expression(state);

				p.eat_whitespace(state);
				p.eat(state, '}', 'closing spread bracket');

				let node = t.attribute_spread(expression);
				node.start = start;
				node.end = state.index;

				p.eat_whitespace(state);

				attributes.push(node);
				continue;
			}

			let attr_name = p.eat_until(state, /[\s=\/>'"]/g);
			let attr_value = null;

			if (!attr_name) {
				break;
			}

			if (attribute_names.has(attr_name)) {
				throw p.error(state, `duplicate ${attr_name} attribute`, start, state.index);
			}

			let end = state.index;

			p.eat_whitespace(state);

			if (p.eat_pattern(state, /['"]/g)) {
				throw p.error(state, 'expected attribute assignment');
			}

			if (p.eat(state, '=')) {
				let value_start = state.index;
				let quotation = p.eat_pattern(state, /['"]/g);

				if (quotation) {
					let end_pattern = quotation === '"' ? /"/g : /'/g;
					let data = p.eat_until(state, end_pattern);
					p.eat(state, quotation, 'closing quotation mark');

					let node = t.text(data);
					node.start = value_start;
					node.end = state.index;

					attr_value = node;
				}
				else if (p.eat(state, '{')) {
					p.eat_whitespace(state);

					let expression = _read_expression(state);

					p.eat_whitespace(state);
					p.eat(state, '}', 'closing expression bracket');

					let node = t.expression(expression);
					node.start = value_start;
					node.end = state.index;

					attr_value = node;
				}
				else {
					let data = p.eat_until(state, /[\s=\/>'"]/g);

					let node = t.text(data);
					node.start = value_start;
					node.end = state.index;

					attr_value = node;
				}

				end = state.index;
				p.eat_whitespace(state);
			}

			let node = t.attribute(attr_name, attr_value);
			node.start = start;
			node.end = end;

			attributes.push(node);
			attribute_names.add(attr_name);
		}
	}

	let self_closing = p.eat(state, '/') || is_void(name);
	p.eat(state, '>', 'closing tag bracket');

	let node = t.element(name, self_closing, attributes);
	node.start = start;
	node.end = state.index;

	parent.children.push(node);

	if (!self_closing && (name === 'script' || name === 'style')) {
		// we shouldn't parse into script and style elements
		let pattern = name === 'script' ? /<\/script\s*>/g : /<\/style\s*>/g;
		let data = p.eat_until(state, pattern);

		p.eat_pattern(state, pattern, `${name} closing tag`);

		let text = t.text(data, data);

		node.end = state.index;
		node.children.push(text);
	}
	else if (!self_closing) {
		p.push(state, node);
	}
}

/**
 * @param {p.ParserState} state
 * @returns {import('estree').Expression}
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

		while (parens > 0) {
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
