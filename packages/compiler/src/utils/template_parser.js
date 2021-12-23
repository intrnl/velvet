import * as t from './template_types.js';


/**
 * @typedef {object} ParserState
 * @property {string} content
 * @property {number} index
 * @property {t.StackableNode[]} stack
 */

/**
 * @param {string} content
 * @returns {ParserState}
 */
export function create_state (content) {
	/** @type {t.Fragment} */
	let root = t.fragment();

	/** @type {ParserState} */
	let state = {
		content: content,
		index: 0,
		stack: [root],
	};

	return state;
}

/**
 * @param {ParserState} state
 * @param {number} [cursor]
 * @returns {t.StackableNode}
 */
export function current (state, cursor = 0) {
	return state.stack[state.stack.length - 1 - cursor];
}

/**
 * @param {ParserState} state
 * @param  {...t.StackableNode} nodes
 */
export function push (state, ...nodes) {
	state.stack.push(...nodes);
}

/**
 * @param {ParserState} state
 * @param {number} [amount]
 * @returns {t.StackableNode[]}
 */
export function pop (state, amount = 1) {
	return state.stack.splice(state.stack.length - amount, amount);
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
 * @param {RegExp} pattern
 * @returns {string | false}
 */
export function match_pattern (state, pattern) {
	pattern.lastIndex = state.index;

	let match = pattern.exec(state.content);

	if (!match || match.index !== state.index) {
		return false;
	}

	return match[0];
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
 * @param {RegExp} pattern
 * @param {string} required
 * @returns {string | false}
 */
export function eat_pattern (state, pattern, required) {
	let result = match_pattern(state, pattern);

	if (result) {
		state.index += result.length;
	}
	else if (required) {
		let message = `expected ${required}`;
		throw error(state, message);
	}

	return result;
}

/**
 * @param {ParserState} state
 * @param {RegExp} pattern
 * @returns {string | null}
 */
export function eat_until (state, pattern) {
	let start = state.index;
	pattern.lastIndex = start;

	let match = pattern.exec(state.content);

	if (match) {
		state.index = match.index;
		return state.content.slice(start, state.index);
	}

	state.index = state.content.length;
	return state.content.slice(start);
}

/**
 * @param {ParserState} state
 * @param {string} message
 * @returns {object}
 */
export function error (state, message, index = state.index) {
	return {
		name: 'ParserError',
		message,
		index,
	};
}

/**
 * @param {string} char
 * @returns {boolean}
 */
export function is_whitespace (char) {
	return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}
