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

	let _is_transformed = new WeakSet();

	// - mark variables that have mutable operations
	// - mark props
	// - transform reactive, mark computed variables as mutable
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node) {
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

					let expression = x`__effect(() => ${statement})`;

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
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node, parent) {
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

					let primitive = init && t.is_primitive(init);

					let initializer = init
						? primitive
							? init
							: x`() => ${init}`
						: null;

					let expression = is_computed && !primitive
						? x`__computed(${initializer})`
						: prop
							? x`__prop(${t.literal(prop_idx)}, ${initializer})`
							: is_mutable
								? x`__ref(${init})`
								: init;

					node.init = expression;

					if (is_mutable || is_prop) {
						refs.add(name);
					}
				}

				return;
			}

			// transform getters
			if (
				node.type === 'Identifier' &&
				parent.type !== 'AssignmentExpression' &&
				parent.type !== 'MemberExpression' &&
				parent.type !== 'VariableDeclarator'
			) {
				let name = node.name;

				if (_is_transformed.has(node)) {
					return;
				}

				if (refs.has(name) && current_scope.find_owner(name) === root_scope) {
					let expression = x`${node}(__access)`;

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

				if (refs.has(name) && current_scope.find_owner(name) === root_scope) {
					let expression;

					switch (node.operator) {
						case '=': {
							expression = x`${identifier}(${right})`;
							break;
						}
						default: {
							let getter = x`${identifier}(__access)`;
							let operation = t.binary_expression(getter, right, node.operator.slice(0, -1));
							expression = x`${identifier}(${operation})`;
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

					let getter = x`${identifier}(__access)`;
					let operation = t.binary_expression(getter, t.literal(1), operator.slice(0, -1));
					let expression = x`${identifier}(${operation})`;

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
