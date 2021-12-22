import { decode_character_references } from './html.js';


/**
 * @typedef {object} Fragment
 * @property {'Fragment'} type
 * @property {Array<Node>} children
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {Array<Node>} [children]
 * @returns {Fragment}
 */
export function fragment (children = []) {
	return {
		type: 'Fragment',
		children: children.filter((child) => !!child),
	};
}

/**
 * @typedef {(
 *   Text |
 *   Element |
 *   Expression |
 *   NamedExpression |
 *   ConditionalStatement |
 *   LoopStatement |
 *   AwaitStatement
 * )} Node
 */

/**
 * @typedef {(
 *   Fragment |
 *   ConditionalStatement |
 *   LoopStatement |
 * 	 AwaitStatement
 * )} StackableNode
 */

/**
 * @typedef {object} Text
 * @property {'Text'} type
 * @property {string} data
 * @property {string} raw
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {string} raw
 * @param {string} [data]
 * @returns {Text}
 */
export function text (raw, data = decode_character_references(raw)) {
	return {
		type: 'Text',
		data,
		raw,
	};
}

/**
 * @typedef {object} Element
 * @property {'Element'} type
 * @property {Array<ElementAttribute>} attributes
 * @property {Array<Node>} children
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {Array<ElementAttribute>} [attributes]
 * @param {Array<Node>} [children]
 * @returns {Element}
 */
export function element (attributes = [], children = []) {
	return {
		type: 'Element',
		attributes,
		children,
	};
}

/**
 * @typedef {object} ElementAttribute
 * @typedef {'ElementAttribute'} type
 * @property {string} name
 * @property {Array<Text | Expression>} [value]
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {string} name
 * @param {Array<Text | Expression>} [value]
 * @returns {ElementAttribute}
 */
export function element_attribute (name, value = null) {
	return {
		type: 'ElementAttribute',
		name,
		value,
	};
}

/**
 * @typedef {object} Expression
 * @property {'Expression'} type
 * @property {import('estree').Expression} expression
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {import('estree').Expression} expression
 * @returns {Expression}
 */
export function expression (expression) {
	return {
		type: 'Expression',
		expression,
	};
}


/**
 * @typedef {object} NamedExpression
 * @property {'NamedExpression'} type
 * @property {string} name
 * @property {import('estree').Expression} [expression]
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {string} name
 * @param {import('estree').Expression} [expression]
 * @returns {NamedExpression}
 */
export function named_expression (name, expression) {
	return {
		type: 'NamedExpression',
		name,
		expression,
	};
}

/**
 * @typedef {object} ConditionalStatement
 * @property {'ConditionalStatement'} type
 * @property {import('estree').Expression} test
 * @property {Fragment} consequent
 * @property {Fragment | ConditionalStatement} [alternate]
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {import('estree').Expression} test
 * @param {Fragment} consequent
 * @param {Fragment | ConditionalStatement} [alternate]
 * @returns {ConditionalStatement}
 */
export function conditional_statement (test, consequent, alternate = null) {
	return {
		type: 'ConditionalStatement',
		test,
		consequent,
		alternate,
	};
}

/**
 * @typedef {object} LoopStatement
 * @property {'LoopStatement'} type
 * @property {'iterable' | 'enumerable'} kind
 * @property {import('estree').Pattern} local
 * @property {import('estree').Expression} expression
 * @property {Fragment} body
 * @property {Fragment} [alternate]
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {'iterable' | 'enumerable'} kind
 * @param {import('estree').Expression} expression
 * @param {import('estree').Pattern} local
 * @param {Fragment} body
 * @param {Fragment} [alternate]
 * @returns {LoopStatement}
 */
export function loop_statement (kind, expression, local, body, alternate = null) {
	return {
		type: 'LoopStatement',
		kind,
		expression,
		local,
		body,
		alternate,
	};
}

/**
 * @typedef {object} AwaitStatement
 * @property {'AwaitStatement'} type
 * @property {import('estree').Expression} argument
 * @property {Fragment} [pending]
 * @property {AwaitClause} [resolved]
 * @property {AwaitClause} [rejected]
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {import('estree').Expression} argument
 * @param {Fragment} [pending]
 * @param {AwaitClause} [resolved]
 * @param {AwaitClause} [rejected]
 * @returns {AwaitStatement}
 */
export function await_statement (argument, pending = null, resolved = null, rejected = null) {
	return {
		type: 'AwaitStatement',
		argument,
		pending,
		resolved,
		rejected,
	};
}

/**
 * @typedef {object} AwaitClause
 * @property {'AwaitClause'} type
 * @property {import('estree').Pattern} [local]
 * @property {Fragment} body
 */

/**
 * @param {import('estree').Pattern} [local]
 * @param {Fragment} body
 * @returns {AwaitClause}
 */
export function await_clause (local, body) {
	return {
		type: 'AwaitClause',
		local,
		body,
	};
}
