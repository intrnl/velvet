import { walk } from './utils/walker.js';
import { analyze, is_reference } from './utils/js_utils.js';
import * as t from './utils/js_types.js';
import { create_error } from './utils/error.js';


export function transform_script (program, source) {
	let { map, scope: root_scope } = analyze(program);
	let curr_scope = root_scope;

	let potential_props = new Map();

	let props = new Map();
	let props_idx = [];

	// [actual, [scope, reference]]
	let stores = new Map();

	// [container, reference, ...exprs][]
	let deferred_stores = [];

	// - throw on declaring $ and $$ variables
	// - mark variables that have mutable operations
	// - mark props
	// - transform computed variables
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node, parent) {
			if (map.has(node)) {
				curr_scope = map.get(node);
			}

			// throw on declaring $ and $$ variables
			if (
				curr_scope === root_scope &&
				node.type === 'VariableDeclarator' &&
				_has_identifier_declared(node.id, (name) => (
					name[0] === '$' && (name[1] !== '$' || (name[1] === '$' && name[2] !== '$'))
				))
			) {
				throw create_error(
					'$ and $$-prefixed variables are reserved and cannot be declared',
					source,
					node.start,
					node.end,
				);
			}

			// mark mutable variables
			if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') {
				let left = node.left;
				let name = left.name;

				if (name[0] === '$' && name[1] === '$' && name[2] !== '$') {
					throw create_error(
						'tried reassignment to $$-prefixed variables',
						source,
						node.start,
						node.end,
					);
				}

				let own_scope = curr_scope.find_owner(name);

				if (own_scope === root_scope) {
					let ident = own_scope.declarations.get(name);
					(ident.velvet ||= {}).mutable = true;
				}

				return;
			}

			if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') {
				let identifier = node.argument;
				let prefix = node.prefix;

				let name = identifier.name;
				let own_scope = curr_scope.find_owner(name);

				if (own_scope === root_scope) {
					if (!prefix) {
						throw create_error(
							'postfix update expressions are not supported for refs',
							source,
							node.start,
							node.end,
						);
					}

					let ident = own_scope.declarations.get(name);
					(ident.velvet ||= {}).mutable = true;

					let expression = t.assignment_expression(
						identifier,
						t.literal(1),
						node.operator.slice(1) + '=',
					);

					return expression;
				}

				return;
			}

			// mark props
			if (node.type === 'ExportDefaultDeclaration') {
				throw create_error(
					'export default is reserved for component definition',
					source,
					node.start,
					node.end,
				);
			}

			if (node.type === 'ExportNamedDeclaration' && node.declaration) {
				let declaration = node.declaration;

				if (declaration.type === 'VariableDeclaration') {
					for (let declarator of declaration.declarations) {
						let identifier = declarator.id;
						let name = identifier.name;

						potential_props.set(name, name);
					}
				}
				else {
					let identifier = declaration.id;
					let name = identifier.name;

					potential_props.set(name, name);
				}

				return declaration;
			}

			if (node.type === 'ExportNamedDeclaration' && node.specifiers.length) {
				for (let specifier of node.specifiers) {
					let local_name = specifier.local.name;
					let exported_name = specifier.exported.name;

					if (potential_props.has(local_name)) {
						throw create_error(
							'tried to export something that has already been exported',
							source,
							specifier.start,
							specifier.end,
						);
					}

					potential_props.set(local_name, exported_name);
				}

				return walk.remove;
			}

			// transform computed variables
			if (
				curr_scope === root_scope &&
				node.type === 'LabeledStatement' &&
				node.label.name === '$' &&
				node.body.type === 'ExpressionStatement' &&
				node.body.expression.type === 'AssignmentExpression' &&
				node.body.expression.left.type === 'Identifier'
			) {
				let identifier = node.body.expression.left;
				let right = node.body.expression.right;

				let expression = t.variable_declaration('let', [t.variable_declarator(identifier, right)]);

				(identifier.velvet ||= {}).computed = true;
				curr_scope.add_declaration(expression);

				return expression;
			}

			// mark stores
			if (is_reference(node, parent)) {
				let name = node.name;

				if (name[0] !== '$' || name[1] === '$' || curr_scope.has(name)) {
					return;
				}

				if (name.length === 1) {
					throw create_error(
						'no singular $ reference',
						source,
						node.start,
						node.end,
					);
				}

				if (parent.type === 'AssignmentExpression' && parent.left === node && parent.operator === '=') {
					return;
				}

				let ref_scope = find_reference_scope(curr_scope);
				let container = ref_scope.node;

				let actual = name.slice(1);
				let ident = t.identifier(name);

				let decl = t.variable_declaration('let', [
					t.variable_declarator(ident),
				]);

				let expr = t.expression_statement(
					t.call_expression(t.identifier('@cleanup'), [
						t.call_expression(t.member_expression_from(actual, 'subscribe'), [ident]),
					]),
				);

				(ident.velvet ||= {}).mutable = true;
				ident.velvet.transformed = true;

				deferred_stores.push([container, node, decl, expr]);
				ref_scope.add_declaration(decl);
				return;
			}
		},
		leave (node) {
			if (map.has(node)) {
				curr_scope = curr_scope.parent;
			}
		},
	});

	// prepend store subscriptions
	for (let [container, reference, ...exprs] of deferred_stores) {
		let node = reference;

		while (node) {
			let parent = node.path.parent;

			if (!parent) {
				break;
			}

			if (parent === container) {
				let index = container.body.indexOf(node);
				container.body.splice(index, 0, ...exprs);
				break;
			}

			node = parent;
		}
	}

	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node, parent) {
			if (map.has(node)) {
				curr_scope = map.get(node);
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

				let is_mutable = identifier.velvet?.mutable;
				let is_computed = identifier.velvet?.computed;
				let prop = curr_scope === root_scope && potential_props.get(name);

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

				if (is_mutable || is_computed || prop) {
					let prop_idx;

					if (prop) {
						props.set(name, prop);
						prop_idx = props_idx.push(prop) - 1;
					}

					let primitive = init && _is_primitive(init, is_computed && curr_scope);

					let initializer = init
						? primitive
							? init
							: t.arrow_function_expression([], init)
						: null;

					let expression = is_computed && !primitive
						? t.call_expression(t.identifier('@computed'), [initializer])
						: prop
							? t.call_expression(t.identifier('@prop'), [t.literal(prop_idx), initializer])
							: is_mutable
								? t.call_expression(t.identifier('@ref'), [init])
								: init;

					node.init = expression;

					(identifier.velvet ||= {}).ref = expression !== init;
				}

				return;
			}

			// transform getters
			if (is_reference(node, parent)) {
				let name = node.name;

				if (node.velvet?.transformed) {
					return;
				}

				if (parent.type === 'AssignmentExpression' && parent.left === node) {
					return;
				}

				let own_scope = curr_scope.find_owner(name);
				let ident = own_scope && own_scope.declarations.get(name);

				if (ident && ident.velvet?.ref) {
					let expression = t.call_expression(node, [t.identifier('@access')]);

					if (parent.type === 'Property') {
						parent.shorthand = false;
					}

					(node.velvet ||= {}).transformed = true;
					return expression;
				}

				return;
			}

			// transform setters
			if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') {
				let identifier = node.left;
				let right = node.right;

				let name = identifier.name;

				if (name[0] === '$' && name[1] !== '$' && !parent.velvet?.transformed) {
					let actual_ident = t.identifier(name.slice(1));

					let expr;
					let operator = node.operator.slice(0, -1);

					switch (node.operator) {
						case '=': {
							expr = right;
							break
						}
						case '||=': case '&&=': case '??=': {
							expr = t.logical_expression(identifier, right, operator);
							break;
						}
						default: {
							expr = t.binary_expression(identifier, right, operator);
							break;
						}
					}

					let call_expr = t.call_expression(
						t.member_expression(actual_ident, t.identifier('set')),
						[expr],
					);

					(call_expr.velvet ||= {}).transformed = true;
					return call_expr;
				}

				let own_scope = curr_scope.find_owner(name);
				let ident = own_scope && own_scope.declarations.get(name);

				if (ident && ident.velvet?.ref) {
					let expression;
					let operator = node.operator.slice(0, -1);

					switch (node.operator) {
						case '=': {
							expression = t.call_expression(identifier, [right]);
							break;
						}
						case '||=': case '&&=': case '??=': {
							let getter = t.call_expression(identifier, [t.identifier('@access')]);
							let setter = t.assignment_expression(identifier, right, '=');
							expression = t.logical_expression(getter, setter, operator);
							break;
						}
						default: {
							let getter = t.call_expression(identifier, [t.identifier('@access')]);
							let operation = t.binary_expression(getter, right, operator);
							expression = t.call_expression(identifier, [operation]);
							break;
						}
					}

					(identifier.velvet ||= {}).transformed = true;
					return expression;
				}

				return;
			}

			// transform reactive statements
			if (node.type === 'LabeledStatement' && node.label.name === '$') {
				if (curr_scope !== root_scope) {
					let is_valid = false;
					let curr_node = node;

					while (curr_node) {
						let parent = curr_node.path.parent;

						if (!parent) {
							break;
						}

						if (
							parent.type === 'VariableDeclarator' &&
							parent.id.type === 'Identifier' &&
							parent.id.name[0] === '%'
						) {
							is_valid = true;
							break;
						}

						curr_node = parent;
					}

					if (!is_valid) {
						return;
					}
				}

				let is_effect = false;

				walk(node, {
					/**
					 * @param {import('estree').Node} node
					 * @param {import('estree').Node} parent
					 */
					enter (node, parent) {
						if (is_reference(node, parent)) {
							let name = node.name;
							let own_scope = curr_scope.find_owner(name);
							let ident = own_scope && own_scope.declarations.get(name);

							if (ident && ident.velvet?.ref) {
								is_effect = true;
							}
						}

						if (is_effect) {
							return walk.skip;
						}
					},
				});

				if (is_effect) {
					let body = node.body;
					let statement = body.type === 'ExpressionStatement'
						? body.expression
						: body.type === 'BlockStatement'
							? body
							: t.block_statement([body]);

					let effect = t.arrow_function_expression([], statement);
					let expression = t.call_expression(t.identifier('@effect'), [effect]);

					return t.expression_statement(expression);
				}

				return;
			}
		},
		leave (node) {
			if (map.has(node)) {
				curr_scope = curr_scope.parent;
			}
		},
	});

	// - add bindings for props that are not refs
	let bind_props = [];

	for (let [local, exported] of potential_props) {
		if (!props.has(local)) {
			bind_props.push(t.property(t.identifier(exported), t.identifier(local)));
		}
	}

	if (bind_props.length) {
		let expression = t.expression_statement(
			t.call_expression(t.identifier('@bind'), [t.object_expression(bind_props)]),
		);

		program.body.push(expression);
	}

	return { props, props_idx };
}


export function finalize_template (program, name, props_idx) {
	let setup_ident = t.identifier('%setup');

	let setup_decl = t.function_declaration(
		setup_ident,
		[t.identifier('$$root'), t.identifier('$$host')],
		program.body.splice(0, program.body.length),
	);

	let props_decl = t.object_expression(props_idx.map((name, idx) => t.property(t.identifier(name), t.literal(idx))));
	let setup_call = t.call_expression(t.identifier('@define'), [t.literal(name), setup_ident, props_decl]);

	program.body.push(setup_decl);
	program.body.push(t.export_default_declaration(setup_call));
}

export function finalize_program (program, mod = '@intrnl/velvet/internal') {
	/** @type {Set<string>} */
	let identifiers = new Set();

	/** @type {Map<string, Set<import('estree').Identifier>>} */
	let import_identifiers = new Map();
	/** @type {Map<string, Set<import('estree').Identifier>>} */
	let hoisted_identifiers = new Map();

	/** @type {import('estree').Node[]} */
	let hoisted_statements = [];

	// find variables to hoist, and list of things to import from module
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node, parent, key) {
			if (node.type === 'Identifier' && !(parent.type === 'MemberExpression' && key !== 'object')) {
				let name = node.name;

				if (name[0] === '@') {
					name = name.slice(1);

					let set = import_identifiers.get(name);

					if (!set) {
						import_identifiers.set(name, (set = new Set()));
					}

					set.add(node);
				}
				else if (name[0] === '%') {
					name = name.slice(name[1] === '%' ? 2 : 1);

					let set = hoisted_identifiers.get(name);

					if (!set) {
						hoisted_identifiers.set(name, (set = new Set()));
					}

					set.add(node);
				}
				else {
					identifiers.add(name);
				}

				return;
			}
		},
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		leave (node, parent) {
			if (node.type === 'ImportDeclaration') {
				hoisted_statements.push(node);
				return walk.remove;
			}

			if (
				node.type === 'VariableDeclarator' &&
				_has_identifier_declared(node.id, (name) => name[0] === '%' && name[1] === '%')
			) {
				/** @type {import('estree').VariableDeclaration} */
				let parent_node = parent;
				let kind = parent_node.kind;

				let decl = t.variable_declaration(kind, [node]);

				hoisted_statements.push(decl);
				return walk.remove;
			}

			if (node.type === 'VariableDeclaration' && !node.declarations.length) {
				return walk.remove;
			}
		},
	});

	// hoist!
	if (hoisted_statements.length) {
		program.body = [...hoisted_statements, ...program.body];
	}

	for (let [name, set] of hoisted_identifiers) {
		let local = _find_unique_identifier(name, identifiers);

		for (let identifier of set) {
			identifier.name = local;
		}
	}

	// create import declaration
	let import_specifiers = [];

	for (let [imported, set] of import_identifiers) {
		let name = _find_unique_identifier(imported, identifiers);

		for (let identifier of set) {
			identifier.name = name;
		}

		let spec = t.import_specifier(t.identifier(name), t.identifier(imported));
		import_specifiers.push(spec);
	}

	if (import_specifiers.length) {
		let import_decl = t.import_declaration(import_specifiers, t.literal(mod));
		program.body.unshift(import_decl);
	}
}


function _find_unique_identifier (name, set) {
	let local_name = name;
	let count = 0;

	while (set.has(local_name)) {
		local_name = name + '$' + (++count);
	}

	set.add(local_name);

	return local_name;
}

/**
 * @param {(
 *   import('estree').Pattern |
 *   import('estree').Property |
 *   (import('estree').Pattern | import('estree').Property)[]
 * )} node
 */
function _has_identifier_declared (node, filter) {
	if (Array.isArray(node)) {
		return node.some((child) => _has_identifier_declared(child, filter));
	}

	return (
		(node.type === 'Identifier' && filter(node.name)) ||
		(node.type === 'Property' && _has_identifier_declared(node.value, filter)) ||
		(node.type === 'RestElement' && _has_identifier_declared(node.argument, filter)) ||
		(node.type === 'ObjectPattern' && _has_identifier_declared(node.properties, filter)) ||
		(node.type === 'ArrayPattern' && _has_identifier_declared(node.elements, filter))
	);
}

/**
 * @param {import('estree').Expression | import('estree').Expression[]} expression
 */
function _is_primitive (expression, scope) {
	if (Array.isArray(expression)) {
		return expression.every((expr) => _is_primitive(expr, scope));
	}

	if (scope && expression.type === 'Identifier') {
		let name = expression.name;
		let own_scope = scope.find_owner(name);

		if (!own_scope) {
			return true;
		}

		let id = own_scope.declarations.get(name);

		return !id.velvet?.ref;
	}

	return (
		(expression.type === 'Literal' && !expression.regex) ||
		(expression.type === 'TemplateLiteral') ||
		(expression.type === 'UnaryExpression' && _is_primitive(expression.argument, scope)) ||
		(expression.type === 'BinaryExpression' && _is_primitive(expression.left, scope) && _is_primitive(expression.right, scope)) ||
		(expression.type === 'MemberExpression' && _is_primitive(expression.object, scope)) ||
		(expression.type === 'NewExpression' && _is_primitive(expression.callee, scope) && _is_primitive(expression.arguments, scope)) ||
		(expression.type === 'CallExpression' && _is_primitive(expression.callee, scope) && _is_primitive(expression.arguments, scope))
	);
}

function find_reference_scope (scope) {
	// this is to find the right scope for determining where stores should be placed
	// - Program
	// - BlockStatement of ArrowFunctionExpression of VariableDeclarator whose names starts with %

	let curr_scope = scope;

	while (curr_scope) {
		let node = curr_scope.node;

		if (node.type === 'Program') {
			break;
		}

		if (node.type === 'BlockStatement') {
			let parent = node.path.parent;
			let grandparent = parent.path.parent;

			if (
				parent.type === 'ArrowFunctionExpression' &&
				grandparent.type === 'VariableDeclarator' &&
				grandparent.id.name[0] === '%'
			) {
				break;
			}
		}

		curr_scope = curr_scope.parent;
	}

	return curr_scope;
}
