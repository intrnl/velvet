function clone_if_node (obj, deep, loc) {
	if (obj && obj.type) {
		return clone(obj, deep, loc);
	}

	return obj;
}

function clone_if_node_or_array (obj, deep, loc) {
	if (Array.isArray(obj)) {
		return obj.map((item) => clone_if_node(item, deep, loc));
	}

	return clone_if_node(obj, deep, loc);
}


export function clone (node, deep = true, loc = false) {
	let clone = { type: node.type };

	if (node.type === 'Identifier') {
		clone.name = node.name;
	}
	else {
		for (let key in node) {
			if (
				key === 'type' ||
				key === 'comments' ||
				key === 'leadingComments' ||
				key === 'trailingComments'
			) {
				continue;
			}

			if (!loc && (key === 'start' || key === 'end' || key === 'loc')) {
				continue;
			}

			if (key === 'path') {
				continue;
			}

			if (deep) {
				clone[key] = clone_if_node_or_array(node[key], deep, loc);
			}
			else {
				clone[key] = node[key];
			}
		}
	}

	return clone;
}

/**
 * @param {(import('estree').Statement | import('estree').ModuleDeclaration)[]} body
 * @returns {import('estree').Program}
 */
export function program (body = []) {
	return {
		type: 'Program',
		sourceType: 'module',
		body: body.filter((statement) => !!statement),
	};
}

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
 * @param {string | boolean | number | null} value
 * @returns {import('estree').SimpleLiteral}
 */
export function literal (value) {
	return {
		type: 'Literal',
		value: value,
	};
}

/**
 * @param {Array<import('estree').Expression | import('estree').SpreadElement | null>} elements
 * @return {import('estree').ArrayExpression}
 */
export function array_expression (elements = []) {
	return {
		type: 'ArrayExpression',
		elements: elements.filter((element) => !!element),
	};
}

/**
 * @type {(import('estree').Property | import('estree').SpreadElement)[]} [properties]
 * @returns {import('estree').ObjectExpression}
 */
export function object_expression (properties = []) {
	return {
		type: 'ObjectExpression',
		properties: properties.filter((prop) => !!prop),
	};
}

/**
 * @param {import('estree').Expression | import('estree').PrivateIdentifier} key
 * @param {import('estree').Expression | import('estree').Pattern} value
 * @param {boolean} [computed]
 * @param {'kind' | 'get' | 'set'} [kind]
 * @returns {import('estree').Property}
 */
export function property (key, value, computed = false, kind = 'init') {
	return {
		type: 'Property',
		key,
		value,
		kind,
		computed,
		method: kind !== 'init',
		shorthand: key.type === 'Identifier' && value.type === 'Identifier' && key.name === value.name,
	};
}

/**
 * @param {import('estree').Expression | import('estree').Super} object
 * @param {import('estree').Expression | import('estree').PrivateIdentifier} property
 * @param {boolean} [computed]
 * @param {boolean} [optional]
 * @returns {import('estree').MemberExpression}
 */
export function member_expression (object, property, computed = false, optional = false) {
	return {
		type: 'MemberExpression',
		object,
		property,
		computed,
		optional,
	};
}

/**
 * @param {string[]} arr
 * @returns {import('estree').MemberExpression | import('estree').Identifier}
 */
export function member_expression_from (arr) {
	let result = identifier(arr[0]);

	for (let idx = 1; idx < arr.length; idx++) {
		result = member_expression(result, identifier(arr[idx]));
	}

	return result;
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
 * @param {import('estree').Identifier} label
 * @param {import('estree').Statement} body
 * @returns {import('estree').LabeledStatement}
 */
export function labeled_statement (label, body) {
	return {
		type: 'LabeledStatement',
		label,
		body,
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
 * @param {import('estree').AssignmentOperator} [operator]
 * @returns {import('estree').AssignmentExpression}
 */
export function assignment_expression (left, right, operator = '=') {
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
 * @param {import('estree').Expression} test
 * @param {import('estree').Expression} consequent
 * @param {import('estree').Expression} alternate
 * @returns {import('estree').ConditionalExpression}
 */
export function conditional_expression (test, consequent, alternate) {
	return {
		type: 'ConditionalExpression',
		test,
		consequent,
		alternate,
	};
}

/**
 * @param {import('estree').Expression | import('estree').Super} callee
 * @param {(import('estree').Expression | import('estree').SpreadElement)[]} [args]
 * @param {boolean} [optional]
 * @returns {import('estree').SimpleCallExpression}
 */
export function call_expression (callee, args = [], optional = false) {
	return {
		type: 'CallExpression',
		callee,
		arguments: args.filter((args) => !!args),
		optional,
	};
}

/**
 * @param {import('estree').Expression | import('estree').Super} callee
 * @param {(import('estree').Expression | import('estree').SpreadElement)[]} [args]
 * @returns {import('estree').NewExpression}
 */
export function new_expression (callee, args = []) {
	return {
		type: 'NewExpression',
		callee,
		arguments: args.filter((args) => !!args),
	};
}

/**
 * @param {import('estree').Statement[]} body
 * @returns {import('estree').BlockStatement}
 */
export function block_statement (body) {
	return {
		type: 'BlockStatement',
		body: body,
	};
}

/**
 * @param {import('estree').Identifier} id
 * @param {import('estree').Pattern[]} params
 * @param {import('estree').Statement[]} body
 * @param {boolean} [async]
 * @param {boolean} [generator]
 * @returns {import('estree').FunctionDeclaration}
 */
export function function_declaration (id = null, params, body, async = false, generator = false) {
	return {
		type: 'FunctionDeclaration',
		id,
		params,
		body: block_statement(body),
		async,
		generator,
	};
}

/**
 * @param {import('estree').Pattern[]} params
 * @param {import('estree').BlockStatement | import('estree').Expression} body
 * @param {boolean} [async]
 * @returns {import('estree').ArrowFunctionExpression}
 */
export function arrow_function_expression (params, body, async = false) {
	return {
		type: 'ArrowFunctionExpression',
		params: params.filter((param) => !!param),
		body,
		async,
		expression: body.type !== 'BlockStatement',
		generator: false,
	};
}

/**
 * @param {'var' | 'let' | 'cost'} kind
 * @param {import('estree').VariableDeclarator[]} declarations
 * @returns {import('estree').VariableDeclaration}
 */
export function variable_declaration (kind, declarations) {
	return {
		type: 'VariableDeclaration',
		kind,
		declarations,
	};
}

/**
 * @param {import('estree').Pattern} id
 * @param {import('estree').Expression} [init]
 * @returns {import('estree').VariableDeclarator}
 */
export function variable_declarator (id, init = null) {
	return {
		type: 'VariableDeclarator',
		id,
		init,
	};
}

/**
 * @param {(import('estree').ImportSpecifier | import('estree').ImportDefaultSpecifier | import('estree').ImportNamespaceSpecifier)[]} specifiers
 * @param {import('estree').Literal} source
 * @returns {import('estree').ImportDeclaration}
 */
export function import_declaration (specifiers, source) {
	return {
		type: 'ImportDeclaration',
		specifiers: specifiers.filter((specifier) => !!specifier),
		source,
	};
}

/**
 * @param {import('estree').Identifier} local
 * @param {import('estree').Identifier} imported
 * @returns {import('estree').ImportSpecifier}
 */
export function import_specifier (local, imported) {
	return {
		type: 'ImportSpecifier',
		local,
		imported,
	};
}

/**
 * @param {import('estree').Identifier} local
 * @returns {import('estree').ImportDefaultSpecifier}
 */
export function import_default_specifier (local) {
	return {
		type: 'ImportDefaultSpecifier',
		local,
	};
}

/**
 * @param {import('estree').Declaration | import('estree').Expression} declaration
 * @returns {import('estree').ExportDefaultDeclaration}
 */
export function export_default_declaration (declaration) {
	return {
		type: 'ExportDefaultDeclaration',
		declaration,
	};
}

/**
 * @param {?import('estree').Expression} declaration
 * @returns {import('estree').ReturnStatement}
 */
export function return_statement (argument) {
	return {
		type: 'ReturnStatement',
		argument,
	};
}
