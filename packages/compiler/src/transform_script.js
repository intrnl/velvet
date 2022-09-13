import { walk } from './utils/walker.js';
import { analyze, extract_identifiers, is_reference } from './utils/js_utils.js';
import * as t from './utils/js_types.js';
import { create_error } from './utils/error.js';


export function transform_script (program, source) {
	let { map, scope: root_scope } = analyze(program);
	let curr_scope = root_scope;

	let potential_props = new Map();

	let props = new Map();
	let props_idx = [];

	let d_count = 0;

	// [ident, [scope, reference]][]
	let deferred_stores = [];
	// [reference, [...declarations]][]
	let deferred_placeholders = [];

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
			if (node.type === 'AssignmentExpression') {
				let identifiers = extract_identifiers(node.left, false);

				for (let id of identifiers) {
					let name = id.name;

					if (name[0] === '$' && name[1] === '$' && name[2] !== '$') {
						throw create_error(
							'tried reassignment to $$-prefixed variables',
							source,
							node.start,
							node.end,
						);
					}

					let own_scope = curr_scope.find_owner(name);

					if (own_scope) {
						let ident = own_scope.declarations.get(name);

						if (own_scope === root_scope || ident.velvet?.computed) {
							(ident.velvet ||= {}).mutable = true;
						}
					}
				}

				return;
			}

			if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') {
				let identifier = node.argument;

				let name = identifier.name;
				let own_scope = curr_scope.find_owner(name);

				if (own_scope) {
					let ident = own_scope.declarations.get(name);

					if (own_scope === root_scope || ident.velvet?.computed) {
						(ident.velvet ||= {}).mutable = true;
					}
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
				node.body.expression.type === 'AssignmentExpression'
			) {
				let expression = node.body.expression;

				let left = expression.left;
				let right = expression.right;

				if (left.type === 'Identifier') {
					let expr = t.variable_declaration('let', [t.variable_declarator(left, right)]);

					(left.velvet ||= {}).computed = true;
					curr_scope.add_declaration(expr);
					return expr;
				}

				let identifiers = extract_identifiers(left, false);
				let declarators = [];

				if (identifiers.length < 1) {
					return;
				}

				for (let id of identifiers) {
					let ident = t.identifier(id.name);
					ident.velvet = { mutable: true };

					let declarator =  t.variable_declarator(ident);
					declarators.push(declarator);
				}

				let declaration =  t.variable_declaration('let', declarators);

				let statement = t.labeled_statement(
					t.identifier('$'),
					t.block_statement([t.expression_statement(expression)]),
				);

				curr_scope.add_declaration(declaration);
				deferred_placeholders.push([statement, [declaration]]);

				return statement;
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

				// 1. we'll try to find the scope that actual has been defined in, if not found, then we
				//    will assume global and use the root scope.
				// 2. store the first referenced identifier, and the plausible scope to place the
				//    declarations in.
				// 3. if it's referenced again, do the following:
				//    - if the scope is the same as current scope, do nothing.
				//    - if the scope depth is shallow than current scope, replace scope
				//    - if the scope depth is the same as current scope, walk up to find another scope.

				let actual = name.slice(1);

				let defined_scope = curr_scope.find_owner(actual) || root_scope;
				let ref_scope = find_store_scope(curr_scope);

				let map = defined_scope._stores ||= Object.create(null);
				let def = map[actual];

				if (def) {
					let curr = def[0];

					if (curr === ref_scope) {
						// do nothing
					}
					else if (curr.depth > ref_scope.depth) {
						def[0] = ref_scope;
					}
					else if (curr.depth === ref_scope.depth) {
						def[0] = find_store_scope(curr.parent);
					}
				}
				else {
					deferred_stores.push([name, map[actual] = [ref_scope, node]]);
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

	// - add placeholder declarations
	if (deferred_placeholders.length) {
		_push_deferred_placeholders(deferred_placeholders);
		deferred_placeholders = [];
	}

	// - prepend store subscriptions
	if (deferred_stores.length) {
		_push_deferred_stores(deferred_stores);
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
								? t.call_expression(t.identifier('@signal'), [init])
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

				let own_scope = curr_scope.find_owner(name);
				let ident = own_scope && own_scope.declarations.get(name);

				if (ident && ident.velvet?.ref) {
					let expression = t.member_expression(node, t.identifier('value'));

					if (parent.type === 'Property') {
						parent.shorthand = false;
					}

					(node.velvet ||= {}).transformed = true;
					return expression;
				}

				return;
			}

			// transform setters
			// if we're dealing with a store, we don't want to actually mutate the
			// holding ref for the store.
			if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') {
				let argument = node.argument;
				let prefix = node.prefix;
				let name = argument.name;

				if (name[0] === '$' && name[1] !== '$' && !parent.velvet?.transformed) {
					let actual_ident = t.identifier(name.slice(1));

					let expr = !prefix
						? t.binary_expression(argument, t.literal(1), node.operator.slice(1))
						: argument;

					let call_expr = t.call_expression(
						t.member_expression(actual_ident, t.identifier('set')),
						[expr],
					);

					(call_expr.velvet ||= {}).transformed = true;
					return call_expr;
				}

				return;
			}

			if (node.type === 'AssignmentExpression') {
				let left = node.left;
				let right = node.right;

				if (left.type === 'Identifier') {
					let name = left.name;

					if (name[0] === '$' && name[1] !== '$' && !parent.velvet?.transformed) {
						let actual_ident = t.identifier(name.slice(1));

						let expr;
						let operator = node.operator.slice(0, -1);

						switch (node.operator) {
							case '=': {
								expr = right;
								break;
							}
							case '||=': case '&&=': case '??=': {
								expr = t.logical_expression(left, right, operator);
								break;
							}
							default: {
								expr = t.binary_expression(left, right, operator);
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

					return;
				}

				if ((left.type === 'ObjectPattern' || left.type === 'ArrayPattern') && !left.velvet?.transformed) {
					let statements = [];
					let identifiers = extract_identifiers(left);

					let map = new WeakMap();
					let need_transform = false;

					for (let id of identifiers) {
						let name = id.name;

						let own_scope = curr_scope.find_owner(name);
						let ident = own_scope && own_scope.declarations.get(name);

						let need_local_transform = ident && ident.velvet?.ref;
						need_transform ||= need_local_transform;

						map.set(id, need_local_transform);
					}

					if (!need_transform) {
						return;
					}

					let holder = '%d' + (d_count++);

					// we perform a walk here, because we won't be seeing it again.
					let prev_scope = curr_scope;
					right = walk(right, this, node);
					curr_scope = prev_scope;

					let var_decls = [
						t.variable_declarator(t.identifier(holder)),
					];

					let holder_assign = t.assignment_expression(t.identifier(holder), right);
					let spread_assign = t.assignment_expression(left, t.identifier(holder));

					statements.push(holder_assign, spread_assign);

					for (let id of identifiers) {
						if (!map.get(id)) {
							continue;
						}

						let parent = id.path.parent;

						if (parent && parent.type === 'Property') {
							parent.shorthand = false;
						}

						let curr_name = id.name;
						let next_name = '%d' + (d_count++);

						let decl = t.variable_declarator(t.identifier(next_name));

						let assignment = t.assignment_expression(
							t.identifier(curr_name),
							t.identifier(next_name),
						);

						id.name = next_name;

						statements.push(assignment);
						var_decls.push(decl);
					}

					let holder_decl = t.variable_declaration('let', var_decls);

					statements.push(t.identifier(holder));
					deferred_placeholders.push([parent, [holder_decl]]);

					(left.velvet ||= {}).transformed = true;
					return t.sequence_expression(statements);
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

	// - add placeholder declarations
	if (deferred_placeholders.length) {
		_push_deferred_placeholders(deferred_placeholders);
	}

	// - add bindings for props that are not refs
	if (potential_props.size) {
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
	}

	return { props, props_idx };
}


export function finalize_template (program, name, props_idx, style) {
	let style_elems = [];

	if (style) {
		let c = 0;

		for (let dep of style.dependencies) {
			let ident = t.identifier('%%style' + (c++));

			let specifier = t.import_default_specifier(ident);
			let declaration = t.import_declaration([specifier], t.literal(dep));

			program.body.push(declaration);
			style_elems.push(ident);
		}

		if (style.css) {
			let ident = t.identifier('%%style' + (c++));

			let expr = t.call_expression(t.identifier('@css'), [t.literal(style.css)]);
			let decl = t.variable_declaration('let', [t.variable_declarator(ident, expr)]);

			program.body.push(decl);
			style_elems.push(ident);
		}
	}

	let setup_ident = t.identifier('%setup');

	let setup_decl = t.function_declaration(
		setup_ident,
		[t.identifier('$$root'), t.identifier('$$host')],
		program.body.splice(0, program.body.length),
	);

	let props_decl = t.object_expression(props_idx.map((name, idx) => t.property(t.identifier(name), t.literal(idx))));
	let style_decl = t.array_expression(style_elems);

	let setup_call = t.call_expression(t.identifier('@define'), [
		t.literal(name),
		setup_ident,
		props_decl,
		style_decl,
	]);

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
		// make sure ImportDeclaration(s) are sorted to the top
		hoisted_statements.sort((a, b) => {
			let a_type = a.type;
			let b_type = b.type;

			if (a_type === 'ImportDeclaration' && b_type !== 'ImportDeclaration') {
				return -1;
			}

			if (a_type !== 'ImportDeclaration' && b_type === 'ImportDeclaration') {
				return 1;
			}

			return 0;
		});

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


function _push_deferred_placeholders (deferred_placeholders) {
	for (let [reference, declarations] of deferred_placeholders) {
		let container = reference;
		let curr = reference;

		while (container) {
			if (container.type === 'Program') {
				break;
			}

			if (container.type === 'BlockStatement') {
				break;
			}

			if (container.type === 'ArrowFunctionExpression') {
				// we reached here, so we know that the BlockStatement check earlier
				// failed, so we'll turn it into one.

				let expression = container.body;
				let statement = t.return_statement(expression);
				let body = t.block_statement([statement]);

				if (curr === container) {
					curr = statement;
				}

				expression.path.parent = statement;
				statement.path = { parent: body };
				body.path = { parent: container };

				container.body = body;
				container = body;

				break;
			}

			container = container.path.parent;
		}

		while (curr) {
			let parent = curr.path.parent;

			if (parent === container) {
				let body = container.body;
				let index = body.indexOf(curr);

				container.body = body.slice(0, index).concat(declarations, body.slice(index));
				break;
			}

			curr = parent;
		}
	}
}

function _push_deferred_stores (deferred_stores) {
	for (let [name, [scope, reference]] of deferred_stores) {
		let ident = t.identifier(name);
		let actual = name.slice(1);

		let decl = t.variable_declaration('let', [
			t.variable_declarator(ident),
		]);

		let subscriber = t.arrow_function_expression(
			[t.identifier('%value')],
			t.assignment_expression(
				t.member_expression(ident, t.identifier('value')),
				t.identifier('%value'),
				'=',
			),
		);

		let expr = t.expression_statement(
			t.call_expression(t.identifier('@cleanup'), [
				t.call_expression(t.member_expression_from([actual, 'subscribe']), [subscriber]),
			]),
		);

		ident.velvet = { mutable: true, transformed: true };

		let container = scope.node;
		let curr = reference;

		while (curr) {
			let parent = curr.path.parent;

			if (parent === container) {
				let body = container.body;
				let index = body.indexOf(curr);
				body.splice(index, 0, decl, expr);
				break;
			}

			curr = parent;
		}

		scope.add_declaration(decl);
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
		(expression.type === 'MemberExpression' && _is_primitive(expression.object, scope) && (!expression.computed || _is_primitive(expression.property, scope))) ||
		(expression.type === 'NewExpression' && _is_primitive(expression.callee, scope) && _is_primitive(expression.arguments, scope)) ||
		(expression.type === 'CallExpression' && _is_primitive(expression.callee, scope) && _is_primitive(expression.arguments, scope))
	);
}

function find_store_scope (scope) {
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
