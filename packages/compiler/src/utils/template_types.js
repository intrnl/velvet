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
 *   Comment |
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
 *   Element |
 *   ConditionalStatement |
 *   LoopStatement |
 *   AwaitStatement
 * )} StackableNode
 */

/**
 * @typedef {object} Comment
 * @property {'Comment'} type
 * @property {string} value
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {string} value
 * @returns {Comment}
 */
export function comment (value) {
	return {
		type: 'Comment',
		value,
	};
}

/**
 * @typedef {object} Text
 * @property {'Text'} type
 * @property {string} value
 * @property {string} decoded
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {string} value
 * @param {string} [decoded]
 * @returns {Text}
 */
export function text (value, decoded = decode_character_references(value)) {
	return {
		type: 'Text',
		value,
		decoded,
	};
}

/**
 * @typedef {object} Element
 * @property {'Element'} type
 * @property {string} name
 * @property {boolean} self_closing
 * @property {boolean} component
 * @property {boolean} inline
 * @property {Array<Attribute | AttributeSpread>} attributes
 * @property {Array<Node>} children
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {string} name
 * @param {boolean} self_closing
 * @param {Array<Attribute | AttributeSpread>} [attributes]
 * @param {Array<Node>} [children]
 * @returns {Element}
 */
export function element (name, self_closing, attributes = [], children = []) {
	let inline = /^[A-Z]|^v:(?:self|component)$/.test(name);
	let component = inline || /^[a-z]+-[a-z]+$/.test(name);

	return {
		type: 'Element',
		name,
		self_closing,
		attributes,
		children,
		inline,
		component,
	};
}

/**
 * @typedef {object} Attribute
 * @typedef {'Attribute'} type
 * @property {string} name
 * @property {Text | Expression} [value]
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {string} name
 * @param {Text | Expression} [value]
 * @returns {Attribute}
 */
export function attribute (name, value = null) {
	return {
		type: 'Attribute',
		name,
		value,
	};
}

/**
 * @typedef {object} AttributeSpread
 * @property {'AttributeSpread'} type
 * @property {import('estree').Expression} expression
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {import('estree').Expression} expression
 * @returns {AttributeSpread}
 */
export function attribute_spread (expression) {
	return {
		type: 'Attribute',
		expression,
	};
}

/**
 * @typedef {object} Expression
 * @property {'Expression'} type
 * @property {import('estree').Identifier} [id]
 * @property {import('estree').Expression} expression
 * @property {number} [start]
 * @property {number} [end]
 */

/**
 * @param {import('estree').Expression} expression
 * @param {import('estree').Identifier} [id]
 * @returns {Expression}
 */
export function expression (expression, id = null) {
	return {
		type: 'Expression',
		id,
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
 * @property {import('estree').Identifier} local
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
 * @property {import('estree').Identifier} [local]
 * @property {Fragment} body
 */

/**
 * @param {import('estree').Identifier} [local]
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
