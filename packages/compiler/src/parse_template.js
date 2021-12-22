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

			let consequent = t.fragment();
			let node = t.conditional_statement(test, consequent);

			p.current(state).children.push(node);
			p.push(state, node, consequent);
			return;
		}

		throw p.error(state, 'unknown logic block opening');
	}

	// closing logic block
	if (p.eat(state, '/')) {
		let statement = p.current(state, 1);
		let expected;

		if (statement.type === 'ConditionalStatement') {
			expected = 'if';
		}
		else {
			throw p.error(state, 'unexpected logic block closing');
		}

		p.eat(state, expected, true);
		p.eat_whitespace(state);
		p.eat(state, '}', `closing ${expected} bracket`);

		p.pop(state, 2);
		return;
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
