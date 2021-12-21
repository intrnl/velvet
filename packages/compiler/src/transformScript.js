import { walk } from 'estree-walker';
import { analyze } from 'periscopic';
import { x, b, p } from 'code-red';

import * as t from './types.js';


export function transform_script (program) {
	let { map, scope: root_scope } = analyze(program);

	let current_scope = root_scope;

	let mutables = new Set();

	let refs = new Set();
	let computeds = new Set();
	let props = new Map();
	let props_idx = [];
	let stores = new Set();

	let _is_transformed = new WeakSet();

	// - create node paths
	// - mark variables that have mutable operations
	// - mark props
	// - transform reactive, mark computed variables
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node, parent) {
			node.path ||= { parent };

			if (map.has(node)) {
				current_scope = map.get(node);
			}

			// mark mutable variables
			if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') {
				let identifier = node.argument;
				let prefix = node.prefix;

				let name = identifier.name;

				if (current_scope.find_owner(name) == root_scope) {
					if (!prefix) {
						throw new Error('postfix update expressions are not supported');
					}

					mutables.add(name);
				}

				return;
			}

			if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') {
				let left = node.left;
				let name = left.name;

				if (current_scope.find_owner(name) === root_scope) {
					mutables.add(name);
				}

				return;
			}

			// mark props
			if (node.type === 'ExportNamedDeclaration' && node.declaration) {
				let declaration = node.declaration;

				if (declaration.type === 'VariableDeclaration') {
					for (let declarator of declaration.declarations) {
						let identifier = declarator.id;
						let name = identifier.name;

						props.set(name, name);
						props_idx.push(name);
					}
				} else {
					let identifier = declaration.id;
					let name = identifier.name;

					props.set(name, name);
					props_idx.push(name);
				}

				this.replace(declaration);
				return;
			}

			if (node.type === 'ExportNamedDeclaration' && node.specifiers.length) {
				for (let specifier of node.specifiers) {
					let local_name = specifier.local.name;
					let exported_name = specifier.exported.name;

					props.set(local_name, exported_name);
					props_idx.push(exported_name);
				}

				this.remove();
				return;
			}

			// transform reactive
			if (node.type === 'LabeledStatement') {
				// it's a computed value
				if (
					node.body.type === 'ExpressionStatement' &&
					node.body.expression.type === 'AssignmentExpression' &&
					node.body.expression.left.type === 'Identifier'
				) {
					let identifier = node.body.expression.left;
					let right = node.body.expression.right;

					let name = identifier.name;
					let expressions = b`let ${identifier} = ${right};`;

					let expression = expressions[0];

					computeds.add(name);
					current_scope.add_declaration(expression);

					this.replace(expressions[0]);
					return;
				}

				// it's an effect
				let is_effect = false;

				walk(node, {
					/**
					 * @param {import('estree').Node} node
					 * @param {import('estree').Node} parent
					 */
					enter (node, parent) {
						if (
							node.type === 'Identifier' &&
							refs.has(node.name) &&
							parent.type !== 'ExpressionStatement'
						) {
							is_effect = true;
						}
					},
				});

				if (is_effect) {
					let body = node.body;
					let statement = body.type === 'ExpressionStatement' ? body.expression : body;

					let effect = t.arrow_function_expression([], statement);
					let expression = t.call_expression(t.identifier('__effect'), [effect]);

					this.replace(t.expression_statement(expression));
				}

				return;
			}
		},
		/** @param {import('estree').Node} node */
		leave (node) {
			if (map.has(node)) {
				current_scope = current_scope.parent;
			}
		},
	});

	// - transform getters, setters, and declarators
	// - transform store reactions
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node, parent, key) {
			if (map.has(node)) {
				current_scope = map.get(node);
			}

			// transform refs and props
			if (
				node.type === 'VariableDeclarator' &&
				node.id.type === 'Identifier' &&
				(parent.kind === 'let' || parent.kind === 'var')
			) {
				let identifier = node.id;
				let init = node.init;

				let name = identifier.name;

				let is_mutable = mutables.has(name);
				let is_prop = props.has(name);
				let is_computed = computeds.has(name);

				// computed:
				// - __computed(() => value)
				// - __ref(primitive)
				// - primitive

				// prop:
				// - __prop(index, () => value)
				// - __prop(index, primitive)

				// ref:
				// - __ref(value)
				// - __ref(primitive)

				if ((is_mutable || is_prop || is_computed) && current_scope === root_scope) {
					let prop = props.get(name);
					let prop_idx = prop && props_idx.indexOf(prop);

					let primitive = init && _is_primitive(init, is_computed && refs);

					let initializer = init
						? primitive
							? init
							: t.arrow_function_expression([], init)
						: null;

					let expression = is_computed && !primitive
						? t.call_expression(t.identifier('__computed'), [initializer])
						: prop
							? t.call_expression(t.identifier('__prop'), [t.literal(prop_idx), initializer])
							: is_mutable
								? t.call_expression(t.identifier('__ref'), [init])
								: init;

					node.init = expression;

					if (is_mutable || is_prop || (is_computed && !primitive)) {
						refs.add(name);
					}
				}

				return;
			}

			// transform store getters
			if (
				node.type === 'Identifier' &&
				node.name[0] === '$' &&
				parent.type !== 'LabeledStatement' &&
				parent.type !== 'AssignmentExpression' &&
				!(parent.type === 'MemberExpression' && key !== 'object')
			) {
				let name = node.name;

				let actual = node.name.slice(1);

				if (!stores.has(actual)) {
					let subscription = _add_store_subscription(
						node,
						actual,
						refs.has(actual) && current_scope.find_owner(actual) === root_scope
					);

					root_scope.add_declaration(subscription.declaration);
					_is_transformed.add(subscription.actual_ident);
					stores.add(actual);
					refs.add(name);
				}
			}

			// transform getters
			if (
				node.type === 'Identifier' &&
				parent.type !== 'AssignmentExpression' &&
				!(parent.type === 'MemberExpression' && key !== 'object' && refs.has(node.name)) &&
				!(parent.type === 'VariableDeclarator' && key !== 'init') &&
				!(parent.type === 'Property' && key !== 'value')
			) {
				let name = node.name;

				if (_is_transformed.has(node)) {
					return;
				}

				if (refs.has(name) && current_scope.find_owner(name) === root_scope) {
					let expression = t.call_expression(node, [t.identifier('__access')]);

					_is_transformed.add(node);
					this.replace(expression);
				}

				return;
			}

			// transform setters
			if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') {
				let identifier = node.left;
				let right = node.right;

				let name = identifier.name;

				if (name[0] === '$') {
					let actual = identifier.name.slice(1);

					if (!stores.has(actual)) {
						let subscription = _add_store_subscription(
							identifier,
							actual,
							refs.has(actual) && current_scope.find_owner(actual) === root_scope,
						);

						root_scope.add_declaration(subscription.declaration);
						stores.add(actual);
						refs.add(name);
					}
				}

				if (refs.has(name) && current_scope.find_owner(name) === root_scope) {
					let expression;
					let operator = node.operator.slice(0, -1);

					switch (node.operator) {
						case '=': {
							expression = t.call_expression(identifier, [right]);
							break;
						}
						case '||=': case '&&=': case '??=': {
							let getter = t.call_expression(identifier, [t.identifier('__access')]);
							let setter = t.assignment_expression(identifier, right, '=');
							expression = t.logical_expression(getter, setter, operator);
							break;
						}
						default: {
							let getter = t.call_expression(identifier, [t.identifier('__access')]);
							let operation = t.binary_expression(getter, right, operator);
							expression = t.call_expression(identifier, [operation]);
							break;
						}
					}

					_is_transformed.add(identifier);
					this.replace(expression);
				}

				return;
			}

			if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') {
				let identifier = node.argument;
				let operator = node.operator;
				let prefix = node.prefix;

				let name = identifier.name;

				if (refs.has(name) && current_scope.find_owner(name) === root_scope) {
					if (!prefix) {
						throw new Error('postfix update expressions are not supported');
					}

					let getter = t.call_expression(identifier, [t.identifier('__access')]);
					let operation = t.binary_expression(getter, t.literal(1), operator.slice(0, -1));
					let expression = t.call_expression(identifier, [operation]);

					_is_transformed.add(identifier);
					this.replace(expression);
				}

				return;
			}
		},
		/** @param {import('estree').Node} node */
		leave (node) {
			if (map.has(node)) {
				current_scope = current_scope.parent;
			}
		},
	});

	// - add bindings for props that are not refs
	let is_bindings = [...props].filter(([local]) => !refs.has(local));

	if (is_bindings.length) {
		let properties = is_bindings.map(([local, exported]) => p`${exported}: ${local}`);
		let expression = x`__bind({${properties}})`;

		program.body.push(t.expression_statement(expression));
	}
}

function _add_store_subscription (identifier, actual, is_ref) {
	let actual_ident = t.identifier(actual);

	let getter = is_ref ? t.call_expression(actual_ident, [t.identifier('__access')]) : actual_ident;

	let statement = b`
		let ${identifier} = __ref();
		__cleanup(${getter}.subscribe(${identifier}));
	`;

	let declaration = statement[0];

	let curr_node = identifier;

	while (curr_node) {
		let parent = curr_node.path.parent;

		if (!parent) {
			break;
		}

		if (parent.type === 'Program') {
			let body = parent.body;
			let idx = body.indexOf(curr_node);
			body.splice(idx, 0, ...statement);
		}

		curr_node = parent;
	}

	return { declaration, actual_ident };
}

/**
 * @param {import('estree').Expression | import('estree').Expression[]} expression
 * @param {Set<string>} [refs]
 */
function _is_primitive (expression, refs) {
	if (Array.isArray(expression)) {
		return expression.every((expr) => _is_primitive(expr, refs));
	}

	return (
		(expression.type === 'Literal' && !expression.regex) ||
		(expression.type === 'TemplateLiteral') ||
		(expression.type === 'UnaryExpression' && _is_primitive(expression.argument, refs)) ||
		(expression.type === 'BinaryExpression' && _is_primitive(expression.left, refs) && _is_primitive(expression.right, refs)) ||
		(expression.type === 'MemberExpression' && _is_primitive(expression.object, refs)) ||
		(expression.type === 'NewExpression' && _is_primitive(expression.callee, refs) && _is_primitive(expression.arguments)) ||
		(expression.type === 'CallExpression' && _is_primitive(expression.callee) && _is_primitive(expression.arguments)) ||
		(refs && expression.type === 'Identifier' && !refs.has(expression.name))
	);
}

