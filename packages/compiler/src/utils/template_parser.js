import { isIdentifierChar, isIdentifierStart } from 'acorn';

import { create_error } from './error.js';
import * as t from './js_types.js';
import * as tt from './template_types.js';

/**
 * @typedef {object} ParserState
 * @property {string} content
 * @property {number} index
 * @property {tt.StackableNode[]} stack
 * @property {ParseMode[]} modes
 */

/**
 * @typedef {false | 'svg' | 'math'} ParseMode
 */

/**
 * @param {string} content
 * @returns {ParserState}
 */
export function create_state (content) {
	/** @type {tt.Fragment} */
	let root = tt.fragment();

	/** @type {ParserState} */
	let state = {
		content: content,
		index: 0,
		stack: [root],
		modes: [false],
	};

	return state;
}

/**
 * @param {ParserState} state
 * @param {number} [cursor]
 * @returns {tt.StackableNode}
 */
export function current (state, cursor = 0) {
	return state.stack[state.stack.length - 1 - cursor];
}

/**
 * @param {ParserState} state
 * @param {number} cursor
 * @returns {ParseMode}
 */
export function current_mode (state, cursor = 0) {
	return state.modes[state.modes.length - 1 - cursor];
}

/**
 * @param {ParserState} state
 * @param  {...tt.StackableNode} nodes
 */
export function push (state, ...nodes) {
	state.stack.push(...nodes);
}

/**
 * @param {ParserState} state
 * @param {ParseMode} mode
 */
export function push_mode (state, mode) {
	state.modes.push(mode);
}

/**
 * @param {ParserState} state
 * @param {number} [amount]
 * @returns {tt.StackableNode[]}
 */
export function pop (state, amount = 1) {
	return state.stack.splice(state.stack.length - amount, amount);
}

/**
 * @param {ParserState} state
 */
export function pop_mode (state) {
	state.modes.pop();
}

/**
 * @param {ParserState} state
 * @param {string} str
 * @returns {boolean}
 */
export function match (state, str) {
	return state.content.slice(state.index, state.index + str.length) === str;
}

/**
 * @param {ParserState} state
 * @param {string} str
 * @param {string | boolean} [required]
 * @returns {boolean}
 */
export function eat (state, str, required) {
	if (match(state, str)) {
		state.index += str.length;
		return true;
	}

	if (required) {
		let message = `expected ${typeof required === 'string' ? required : str}`;
		throw error(state, message);
	}

	return false;
}

/**
 * @param {ParserState} state
 * @param {string | boolean} [required]
 */
export function eat_whitespace (state, required) {
	let pass = false;

	for (; state.index < state.content.length; state.index++) {
		let char = state.content[state.index];

		if (!is_whitespace(char)) {
			break;
		}

		pass = true;
	}

	if (pass) {
		return true;
	}

	if (required) {
		let message = `expected ${typeof required === 'string' ? required : 'whitespace'}`;
		throw error(state, message);
	}

	return false;
}

/**
 * @param {ParserState} state
 */
export function eat_identifier (state) {
	let start_index = state.index;

	let index = start_index;
	let start = get_char_code(state.content, index);

	if (!isIdentifierStart(start, true)) {
		return null;
	}

	index += start <= 0xffff ? 1 : 2;

	while (index < state.content.length) {
		let code = get_char_code(state.content, index);

		if (!isIdentifierChar(code, true)) {
			break;
		}

		index += code <= 0xffff ? 1 : 2;
	}

	let ident = t.identifier(state.content.slice(state.index, state.index = index));
	ident.start = start_index;
	ident.end = state.index;

	return ident;
}

/**
 * @param {ParserState} state
 * @param {boolean} condition
 * @param {string} [message]
 */
export function assert (state, condition, message = 'Assertion failed') {
	if (!condition) {
		throw error(state, message);
	}
}

/**
 * @param {ParserState} state
 * @param {string} message
 * @returns {object}
 */
export function error (state, message, start = state.index, end = start) {
	return create_error(message, state.content, start, end);
}

/**
 * @param {string} char
 * @returns {boolean}
 */
export function is_whitespace (char) {
	return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}

function get_char_code (str, index) {
	let code = str.charCodeAt(index);

	if (code <= 0xd7ff || code >= 0xe000) {
		return code;
	}

	let next = str.charCodeAt(index + 1);
	return (code << 10) + next - 0x35fdc00;
}
