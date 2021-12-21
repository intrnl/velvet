/**
 * @param {string} name
 * @returns {import('estree').Identifier}
 */
export function identifier (name) {
	return {
		type: 'Identifier',
		name,
	};
}

/**
 * @param {any} value
 * @returns {import('estree').SimpleLiteral}
 */
export function literal (value) {
	return {
		type: 'Literal',
		value: value,
	};
}

/**
 * @param {import('estree').Expression} expression
 * @returns {import('estree').ExpressionStatement}
 */
export function expression_statement (expression) {
	return {
		type: 'ExpressionStatement',
		expression,
	};
}

/**
 * @param {import('estree').Expression} left
 * @param {import('estree').Expression} right
 * @param {import('estree').BinaryOperator} operator
 * @returns {import('estree').BinaryExpression}
 */
export function binary_expression (left, right, operator) {
	return {
		type: 'BinaryExpression',
		left,
		right,
		operator,
	};
}

/**
 * @param {import('estree').Pattern | import('estree').MemberExpression} left
 * @param {import('estree').Expression} right
 * @param {import('estree').AssignmentOperator} operator
 * @returns {import('estree').AssignmentExpression}
 */
export function assignment_expression (left, right, operator) {
	return {
		type: 'AssignmentExpression',
		left,
		right,
		operator,
	};
}

/**
 * @param {import('estree').Expression} left
 * @param {import('estree').Expression} right
 * @param {import('estree').LogicalOperator} operator
 * @returns {import('estree').LogicalExpression}
 */
export function logical_expression (left, right, operator) {
	return {
		type: 'LogicalExpression',
		left,
		right,
		operator,
	};
}

/**
 * @param {import('estree').Expression | import('estree').Super} callee
 * @param {(import('estree').Expression | import('estree').SpreadElement)[]} args
 * @param {boolean} [optional]
 * @returns {import('estree').SimpleCallExpression}
 */
export function call_expression (callee, args, optional = false) {
	return {
		type: 'CallExpression',
		callee,
		arguments: args.filter((args) => !!args),
		optional,
	};
}

/**
 * @param {import('estree').Pattern} params
 * @param {import('estree').BlockStatement | import('estree').Expression} body
 * @param {boolean} [async]
 * @returns {import('estree').ArrowFunctionExpression}
 */
export function arrow_function_expression (params, body, async = false) {
	return {
		type: 'ArrowFunctionExpression',
		params,
		body,
		async,
		expression: body.type !== 'BlockStatement',
		generator: false,
	};
}
