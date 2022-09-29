import { walk } from './walker.js';


/**
 * @param {import('estree').Node} node
 * @param {import('estree').Node} parent
 * @return {node is import('estree').Identifier}
 */
export function is_reference (node, parent) {
	// if (node.type === 'MemberExpression') {
	// 	return is_reference(node.object, node);
	// }

	if (node.type === 'Identifier') {
		if (!parent) {
			return true;
		}

		switch (parent.type) {
			// disregard `bar` in `foo.bar`
			case 'MemberExpression':
				return parent.computed || node === parent.object;

			// disregard the `foo` in `class {foo(){}}` but keep it in `class {[foo](){}}`
			case 'MethodDefinition':
				return parent.computed;

			// disregard the `foo` in `class {foo=bar}` but keep it in `class {[foo]=bar}` and `class {bar=foo}`
			case 'PropertyDefinition':
				return parent.computed || node === parent.value;

			// disregard the `bar` in `{ bar: foo }`, but keep it in `{ [bar]: foo }`
			case 'Property':
				return parent.computed || node === parent.value;

			// disregard the `bar` in `export { foo as bar }` or
			// the foo in `import { foo as bar }`
			case 'ExportSpecifier':
			case 'ImportSpecifier':
				return node === parent.local;

			// disregard the `foo` in `let foo = bar` but keep it in `let bar = foo`
			case 'VariableDeclarator':
				return node === parent.init;

			// disregard the `foo` in `foo = bar` but keep it in `bar = foo`
			// case 'AssignmentExpression': return node === parent.right;
			// case 'UpdateExpression': return node === parent.argument;

			// disregard the `foo` in `(foo) => bar` but keep it in `(bar) => foo`
			case 'ArrowFunctionExpression':
				return node === parent.body;

			// disregard any of the identifiers in a function declaration
			case 'FunctionDeclaration':
			case 'FunctionExpression':
				return false;

			// disregard the `foo` in `foo: while (...) { ... break foo; ... continue foo;}`
			case 'LabeledStatement':
			case 'BreakStatement':
			case 'ContinueStatement':
				return false;
			default:
				return true;
		}
	}

	return false;
}

/**
 * @param {import('estree').Node} param
 * @param {boolean} [nested_prop=true]
 * @param {import('estree').Identifier[]} nodes
 * @returns {import('estree').Identifier[]}
 */
export function extract_identifiers (param, nested_prop = true, nodes = []) {
	switch (param.type) {
		case 'Identifier': {
			nodes.push(param);
			break;
		}

		case 'MemberExpression': {
			if (!nested_prop) {
				break;
			}

			let object = param;

			while (object.type === 'MemberExpression') {
				object = object.object;
			}

			nodes.push(object);
			break;
		}

		case 'ObjectPattern': {
			for (let property of param.properties) {
				if (property.type === 'RestElement') {
					extract_identifiers(property.argument, nested_prop, nodes);
				}
				else {
					extract_identifiers(property.value, nested_prop, nodes);
				}
			}

			break;
		}

		case 'ArrayPattern': {
			for (let element of param.elements) {
				if (element) {
					extract_identifiers(element, nested_prop, nodes);
				}
			}

			break;
		}

		case 'RestElement': {
			extract_identifiers(param.argument, nested_prop, nodes);
			break;
		}

		case 'AssignmentPattern': {
			extract_identifiers(param.left, nested_prop, nodes);
			break;
		}
	}

	return nodes;
}

/** @param {import('estree').Node} expression */
export function analyze (expression) {
	/** @type {WeakMap<import('estree').Node, Scope>} */
	let map = new WeakMap();

	/** @type {Map<string, import('estree').Node>} */
	let globals = new Map();

	let scope = new Scope(null, expression, false);

	/** @type {[Scope, import('estree').Identifier][]} */
	let references = [];
	let current_scope = scope;

	walk(expression, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} [parent]
		 */
		enter (node, parent) {
			switch (node.type) {
				case 'Identifier':
					if (is_reference(node, parent)) {
						references.push([current_scope, node]);
					}

					break;

				case 'ImportDeclaration':
					for (let specifier of node.specifiers) {
						current_scope.declarations.set(specifier.local.name, specifier.local);
					}

					break;

				case 'FunctionExpression':
				case 'FunctionDeclaration':
				case 'ArrowFunctionExpression':
					if (node.type === 'FunctionDeclaration') {
						if (node.id) {
							current_scope.declarations.set(node.id.name, node);
						}

						map.set(node, (current_scope = new Scope(current_scope, node, false)));
					}
					else {
						map.set(node, (current_scope = new Scope(current_scope, node, false)));

						if (node.type === 'FunctionExpression' && node.id) {
							current_scope.declarations.set(node.id.name, node);
						}
					}

					for (let param of node.params) {
						for (let node of extract_identifiers(param)) {
							current_scope.declarations.set(node.name, node);
						}
					}

					break;

				case 'ForStatement':
				case 'ForInStatement':
				case 'ForOfStatement':
					map.set(node, (current_scope = new Scope(current_scope, node, true)));
					break;

				case 'BlockStatement':
					map.set(node, (current_scope = new Scope(current_scope, node, true)));
					break;

				case 'ClassDeclaration':
				case 'VariableDeclaration':
					current_scope.add_declaration(node);
					break;

				case 'CatchClause':
					map.set(node, (current_scope = new Scope(current_scope, node, true)));

					if (node.param) {
						for (let ident of extract_identifiers(node.param)) {
							current_scope.declarations.set(ident.name, ident);
						}
					}

					break;
			}
		},

		/** @param {import('estree').Node} node */
		leave (node) {
			if (map.has(node)) {
				current_scope = current_scope.parent;
			}
		},
	});

	for (let index = references.length - 1; index >= 0; --index) {
		let [scope, reference] = references[index];

		if (!scope.references.has(reference.name)) {
			add_reference(scope, reference.name);
		}
		if (!scope.find_owner(reference.name)) {
			globals.set(reference.name, reference);
		}
	}

	return { map, scope, globals };
}

function add_reference (scope, name) {
	scope.references.add(name);

	if (scope.parent) {
		add_reference(scope.parent, name);
	}
}

export class Scope {
	constructor (parent, node, block) {
		/** @type {Scope | null} */
		this.parent = parent;

		/** @type {boolean} */
		this.block = block;

		/** @type {import('estree').Node} */
		this.node = node;

		/** @type {number} */
		this.depth = parent ? parent.depth + 1 : 0;

		/** @type {Map<string, import('estree').Node>} */
		this.declarations = new Map();

		/** @type {Set<string>} */
		this.initialised_declarations = new Set();

		/** @type {Set<string>} */
		this.references = new Set();
	}

	/**
	 * @param {(
	 *   import('estree').VariableDeclaration |
	 *   import('estree').FunctionDeclaration |
	 *   import('estree').ClassDeclaration
	 * )} node
	 */
	add_declaration (node) {
		if (node.type === 'VariableDeclaration') {
			if (node.kind === 'var' && this.block && this.parent) {
				this.parent.add_declaration(node);
			}
			else {
				for (let declarator of node.declarations) {
					for (let node of extract_identifiers(declarator.id)) {
						this.declarations.set(node.name, node);

						if (declarator.init) {
							this.initialised_declarations.add(node.name);
						}
					}
				}
			}
		}
		else if (node.id) {
			this.declarations.set(node.id.name, node);
		}
	}

	/**
	 * @param {string} name
	 * @returns {Scope | null}
	 */
	find_owner (name) {
		if (this.declarations.has(name)) {
			return this;
		}

		return this.parent && this.parent.find_owner(name);
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	has (name) {
		return !!this.find_owner(name);
	}
}
