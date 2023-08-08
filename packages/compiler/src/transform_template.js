// @ts-check

import { assert, create_error, defined } from './utils/error.js';

import {
	HTML_NO_COLLAPSE,
	HTML_TRIM_EDGE,
	HTML_TRIM_INNER,
	SVG_NO_TRIM_EDGE,
	SVG_NO_TRIM_INNER,
} from './utils/html_whitespaces.js';

import * as t from './utils/js_types.js';
import * as tt from './utils/template_types.js';

import { update_ancestor_info, validate_dom_nesting } from './utils/validate_dom.js';
import { walk } from './utils/walker.js';

/**
 * @typedef {object} Block
 * @property {number} id
 * @property {string} html
 * @property {Map<tt.ChildNode | tt.Fragment, string>} node_to_ident
 * @property {any[]} js_definitions
 * @property {any[]} js_traversals
 * @property {any[]} js_block_defs
 * @property {any[]} js_expressions
 */

/**
 * @param {tt.Fragment} template
 * @param {string} [source]
 */
export function transform_template (template, source) {
	// increment to create unique identifier names
	let id_b = 0;
	let id_n = 0;

	/** @type {Block} */
	let main_block = create_block(id_b++);
	/** @type {Map<tt.Fragment, Block>} */
	let fragment_to_block = new Map();

	/** @type {Block[]} */
	let block_stack = [];
	/** @type {Block} */
	let curr_block = main_block;

	/** @type {import('./utils/template_parser.js').ParseMode[]} */
	let mode_stack = [false];
	/** @type {import('./utils/validate_dom.js').AncestorInfo[]} */
	let ancestor_info_stack = [update_ancestor_info('#fragment', undefined)];

	/** @type {Map<tt.Element, any>} */
	let this_exprs = new Map();
	/** @type {Map<tt.Element, string>} */
	let inline_to_ident = new Map();

	/** @type {Map<string, string>}  */
	let html_to_template_map = new Map();

	walk(template, {
		/**
		 * @param {tt.ChildNode | tt.Fragment | tt.Attribute | tt.AttributeSpread} node
		 * @param {tt.ChildNode | tt.Fragment} parent
		 * @param {string} key
		 * @param {number} index
		 */
		enter (node, parent, key, index) {
			if (node.type === 'Attribute' || node.type === 'AttributeSpread') {
				return walk.skip;
			}

			if (node.type === 'Comment') {
				return walk.remove;
			}

			if (node.type === 'Fragment') {
				if (node !== template) {
					block_stack.push(curr_block);
					curr_block = create_block(id_b++);
				}

				curr_block.node_to_ident.set(node, create_fragment_ident(curr_block.id));
				fragment_to_block.set(node, curr_block);
				return;
			}

			if (node.type === 'Text') {
				assert(parent.type === 'Fragment' || parent.type === 'Element');

				let value = node.value;

				let next_sibling = parent.children[index + 1];

				if (next_sibling) {
					// merge if next children is a text node
					if (next_sibling.type === 'Text') {
						next_sibling.value = value + next_sibling.value;
						return walk.remove;
					}

					// or if next children is a comment node and a text node
					if (next_sibling.type === 'Comment') {
						let next_next_sibling = parent.children[index + 2];

						if (next_next_sibling && next_next_sibling.type === 'Text') {
							next_next_sibling.value = value + next_next_sibling.value;
							return walk.remove;
						}
					}
				}

				// default to destroying any sort of whitespace if we're not on HTML.
				let wrapper = get_current(mode_stack);

				let should_collapse = true;
				let should_trim_edge = !wrapper;
				let should_trim_inner = !wrapper;

				let is_first = index === 0;
				let is_last = index === parent.children.length - 1;

				if (parent === template) {
					// if we're on root fragment, destroy any sort of whitespaces.
					should_trim_edge = true;
					should_trim_inner = true;
				}
				else if (parent.type !== 'Element') {
					// if we're on any other fragments though, let's just trim the edges
					should_trim_edge = true;
				}
				else if (wrapper === 'svg' || wrapper === 'math') {
					// handle some SVG-specific tags that are used for content or formatting.
					should_trim_edge = !SVG_NO_TRIM_EDGE.has(parent.name);
					should_trim_inner = !SVG_NO_TRIM_INNER.has(parent.name);
				}
				else if (wrapper === false) {
					// handle the actual HTML stuff.
					should_collapse = !HTML_NO_COLLAPSE.has(parent.name);
					should_trim_edge = HTML_TRIM_EDGE.has(parent.name);
					should_trim_inner = HTML_TRIM_INNER.has(parent.name);
				}

				if (should_trim_inner && (/^\s+$/).test(value)) {
					return walk.remove;
				}

				if (should_trim_edge) {
					if (is_first && is_last) {
						value = value.trim();
					}
					else if (is_first) {
						value = value.trimStart();
					}
					else if (is_last) {
						value = value.trimEnd();
					}
				}

				if (should_collapse) {
					value = value.replace(/\s+/g, ' ');
				}

				if (!value) {
					return walk.remove;
				}

				let ancestor_info = get_current(ancestor_info_stack);
				let invalid = validate_dom_nesting(null, value, ancestor_info);

				if (invalid) {
					throw create_error(
						invalid.message,
						source,
						node.start,
						node.end,
					);
				}

				let node_ident = create_node_ident(id_n++);

				let traverse_decl = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(node_ident),
						get_traversal_expr(curr_block, parent, index),
					),
				]);

				curr_block.js_traversals.push(traverse_decl);
				curr_block.node_to_ident.set(node, node_ident);

				curr_block.html += value;
				return;
			}

			if (node.type === 'Element') {
				assert(parent.type === 'Fragment' || parent.type === 'Element');

				let elem_name = node.name;
				let real_name = elem_name;

				let is_inline = node.inline;

				let node_ident = create_node_ident(id_n++);

				let traverse_decl = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(node_ident),
						get_traversal_expr(curr_block, parent, index),
					),
				]);

				push_mode(mode_stack, elem_name);

				curr_block.js_traversals.push(traverse_decl);
				curr_block.node_to_ident.set(node, node_ident);

				if (is_inline) {
					if (elem_name === 'v:component' || elem_name === 'v:element') {
						curr_block.html += '<!>';
						elem_name = '!';

						block_stack.push(curr_block);
						curr_block = create_block(id_b++);

						node_ident = create_node_ident(id_n++);
						curr_block.node_to_ident.set(node, node_ident);
					}
					else {
						elem_name = 'x';

						node_ident = create_node_ident(id_n++);
					}

					inline_to_ident.set(node, node_ident);
				}
				else {
					let prev_ancestor_info = get_current(ancestor_info_stack);
					let invalid = validate_dom_nesting(elem_name, null, prev_ancestor_info);

					if (invalid) {
						throw create_error(
							invalid.message,
							source,
							node.start,
							node.end,
						);
					}

					ancestor_info_stack.push(update_ancestor_info(elem_name, prev_ancestor_info));
				}

				let attributes = node.attributes;
				let needs_space = true;

				// checks for properties and bindings
				let is_input = elem_name === 'input';
				let is_textarea = elem_name === 'textarea';
				let is_select = elem_name === 'select';

				/** @type {?string} */
				let input_type = null;

				if (elem_name !== '!') {
					curr_block.html += `<${elem_name}`;
				}

				if (is_input) {
					for (let i = 0, l = attributes.length; i < l; i++) {
						let attr = attributes[i];

						if (attr.type === 'AttributeSpread') {
							continue;
						}

						if (attr.name === 'type' && attr.value && attr.value.type === 'Text') {
							input_type = attr.value.decoded;
							break;
						}
					}
				}

				for (let i = 0, l = attributes.length; i < l; i++) {
					let attr = attributes[i];

					if (attr.type === 'AttributeSpread') {
						let spread_expr = t.labeled_statement(
							t.identifier('$'),
							t.expression_statement(
								t.call_expression(t.identifier('@assign'), [
									t.identifier(node_ident),
									attr.expression,
								]),
							),
						);

						curr_block.js_expressions.push(spread_expr);
						continue;
					}

					let attr_name = attr.name;
					let attr_value = attr.value;

					/** @type {import('estree').Expression} */
					let value_expr = attr_value
						? attr_value.type === 'Text'
							? t.literal(attr_value.decoded)
							: attr_value.expression
						: t.literal(true);

					// handle #this attribute
					if (attr_name === '#this') {
						if (real_name !== 'v:component' && real_name !== 'v:element') {
							throw create_error(
								`expected #this to be used in v:component or v:element`,
								source,
								attr.start,
								attr.end,
							);
						}

						if (!attr_value || attr_value.type === 'Text') {
							throw create_error(
								`expected #this to have an expression`,
								source,
								attr.start,
								attr.end,
							);
						}

						this_exprs.set(node, value_expr);
						continue;
					}

					// handle #ref attribute
					if (attr_name === '#ref') {
						if (
							!attr_value ||
							attr_value.type === 'Text' ||
							(value_expr.type !== 'Identifier' && value_expr.type !== 'MemberExpression')
						) {
							// @ts-expect-error
							let start = attr_value && attr_value.type !== 'Text' ? value_expr.start : attr.start;
							// @ts-expect-error
							let end = attr_value && attr_value.type !== 'Text' ? value_expr.end : attr.end;

							throw create_error(
								`expected #ref to have an identifier or member expression`,
								source,
								start,
								end,
							);
						}

						let ref_expr = t.expression_statement(
							t.assignment_expression(
								value_expr,
								t.identifier(node_ident),
							),
						);

						curr_block.js_expressions.push(ref_expr);
						continue;
					}

					// handle #use attribute
					if (attr_name === '#use') {
						if (!attr_value || attr_value.type === 'Text') {
							throw create_error(
								`expected #use to have an expression`,
								source,
								attr.start,
								attr.end,
							);
						}

						/** @type {import('estree').Expression} */
						let identifier;
						/** @type {?import('estree').Expression} */
						let argument;

						if (value_expr.type === 'ArrayExpression') {
							let elements = value_expr.elements;
							let length = elements.length;

							if (length < 1) {
								throw create_error(
									`expected #use to have at least 1 argument, but only ${length} were passed`,
									source,
									// @ts-expect-error
									value_expr.start,
									// @ts-expect-error
									value_expr.end,
								);
							}
							if (length > 2) {
								throw create_error(
									`expected #use to have not more than 2 argument, ${length} were passed`,
									source,
									// @ts-expect-error
									elements[2].start,
									// @ts-expect-error
									elements[length - 1].end,
								);
							}

							let first = defined(elements[0]);
							let second = length > 1 && elements[1] || null;

							if (first.type === 'SpreadElement') {
								throw create_error(
									`expected #use to have an expression to call, but spread element was passed`,
									source,
									// @ts-expect-error
									first.start,
									// @ts-expect-error
									first.end,
								);
							}
							if (second && second.type === 'SpreadElement') {
								throw create_error(
									`expected #use to have an expression as parameter, but spread element was passed`,
									source,
									// @ts-expect-error
									second.start,
									// @ts-expect-error
									second.end,
								);
							}

							identifier = first;
							argument = second;
						}
						else {
							identifier = value_expr;
							argument = null;
						}

						let use_expr = t.expression_statement(
							t.call_expression(t.identifier('@use'), [
								t.identifier(node_ident),
								identifier,
								argument ? t.arrow_function_expression([], argument) : t.literal(null),
							]),
						);

						curr_block.js_expressions.push(use_expr);
						continue;
					}

					if (attr_name[0] === '#') {
						throw create_error(`unknown #-prefixed attribute`, source, attr.start, attr.end);
					}

					// handle properties and bindings
					let is_prop = attr_name[0] === '.';
					let is_binding = attr_name[0] === ':';

					if (is_prop || is_binding) {
						let prop_name = attr_name.slice(1);

						/** @type {import('estree').Statement} */
						let prop_expr;

						// handle special checkbox group binding
						if (is_input && input_type === 'checkbox' && prop_name === 'group') {
							prop_expr = t.expression_statement(
								t.assignment_expression(
									t.member_expression_from([node_ident, 'checked']),
									t.call_expression(
										t.member_expression(value_expr, t.identifier('includes')),
										[t.member_expression_from([node_ident, 'value'])],
									),
								),
							);
						}
						// handle special radio group binding
						else if (is_input && input_type === 'radio' && prop_name === 'group') {
							prop_expr = t.expression_statement(
								t.assignment_expression(
									t.member_expression_from([node_ident, 'checked']),
									t.binary_expression(
										value_expr,
										t.member_expression_from([node_ident, 'value']),
										'===',
									),
								),
							);
						}
						// handle special select value binding
						else if (is_select && prop_name === 'value') {
							prop_expr = t.expression_statement(
								t.call_expression(t.identifier('@set_select_values'), [
									t.identifier(node_ident),
									value_expr,
								]),
							);
						}
						else {
							prop_expr = t.expression_statement(
								t.assignment_expression(
									t.member_expression(t.identifier(node_ident), t.literal(prop_name), true),
									value_expr,
								),
							);
						}

						if (is_binding || !is_expression_static(value_expr)) {
							prop_expr = t.labeled_statement(t.identifier('$'), prop_expr);
						}

						curr_block.js_expressions.push(prop_expr);

						if (is_binding) {
							let event_name = `update:${prop_name}`;

							let event_fn;

							if (value_expr.type !== 'Identifier' && value_expr.type !== 'MemberExpression') {
								throw create_error(
									`expected :${prop_name} to contain an identifier or a member expression`,
									source,
									// @ts-expect-error
									value_expr.start,
									// @ts-expect-error
									value_expr.end,
								);
							}

							// handle checkbox group binding
							if (is_input && input_type === 'checkbox' && prop_name === 'group') {
								event_name = 'input';

								event_fn = t.arrow_function_expression(
									[],
									t.assignment_expression(
										t.clone(value_expr),
										t.call_expression(t.identifier('@get_checked_values'), [
											t.clone(value_expr),
											t.member_expression_from([node_ident, 'value']),
											t.member_expression_from([node_ident, 'checked']),
										]),
									),
								);
							}
							else if (is_input && input_type === 'radio' && prop_name === 'group') {
								event_name = 'input';

								event_fn = t.arrow_function_expression(
									[],
									t.assignment_expression(
										t.clone(value_expr),
										t.member_expression_from([node_ident, 'value']),
									),
								);
							}
							// handle select value binding
							else if (is_select && prop_name === 'value') {
								event_name = 'input';

								event_fn = t.arrow_function_expression(
									[],
									t.assignment_expression(
										t.clone(value_expr),
										t.call_expression(t.identifier('@get_select_values'), [
											t.identifier(node_ident),
										]),
									),
								);
							}
							// handle input number binding
							else if (is_input && input_type === 'number' && prop_name === 'value') {
								event_name = 'input';

								event_fn = t.arrow_function_expression(
									[],
									t.assignment_expression(
										t.clone(value_expr),
										t.call_expression(t.identifier('@to_number'), [
											t.member_expression_from([node_ident, 'value']),
										]),
									),
								);
							}
							// handle input
							else if (is_input) {
								event_name = 'input';

								if (prop_name !== 'value' && prop_name !== 'checked') {
									throw create_error(
										`invalid binding property "${prop_name}" for input element`,
										source,
										attr.start,
										attr.end,
									);
								}

								event_fn = t.arrow_function_expression(
									[],
									t.assignment_expression(
										t.clone(value_expr),
										t.member_expression_from([node_ident, prop_name]),
									),
								);
							}
							// handle textarea
							else if (is_textarea) {
								event_name = 'input';

								if (prop_name !== 'value') {
									throw create_error(
										`invalid binding property "${prop_name}" for textarea element`,
										source,
										attr.start,
										attr.end,
									);
								}

								event_fn = t.arrow_function_expression(
									[],
									t.assignment_expression(
										t.clone(value_expr),
										t.member_expression_from([node_ident, prop_name]),
									),
								);
							}
							// handle everything else
							else {
								event_fn = t.arrow_function_expression(
									[t.identifier('%event')],
									t.assignment_expression(
										t.clone(value_expr),
										t.member_expression_from(['%event', 'detail']),
									),
								);
							}

							let event_expr = t.expression_statement(
								t.call_expression(t.identifier('@on'), [
									t.identifier(node_ident),
									t.literal(event_name),
									event_fn,
								]),
							);

							curr_block.js_expressions.push(event_expr);
						}

						continue;
					}

					// handle attribute toggle
					let is_toggle = attr_name[0] === '?';

					if (is_toggle || !attr_value) {
						if (is_inline || attr_value) {
							let toggle_name = is_toggle ? attr_name.slice(1) : attr_name;

							/** @type {import('estree').Statement} */
							let toggle_expr = t.expression_statement(
								t.call_expression(t.identifier('@toggle'), [
									t.identifier(node_ident),
									t.literal(toggle_name),
									value_expr,
								]),
							);

							if (!is_expression_static(value_expr)) {
								toggle_expr = t.labeled_statement(t.identifier('$'), toggle_expr);
							}

							curr_block.js_expressions.push(toggle_expr);
						}
						else {
							curr_block.html += `${needs_space ? ' ' : ''}${attr_name}`;
							needs_space = true;
						}

						continue;
					}

					// handle events
					if (attr_name[0] === '@') {
						let event_name = attr_name.slice(1);

						let event_expr = t.expression_statement(
							t.call_expression(t.identifier('@on'), [
								t.identifier(node_ident),
								t.literal(event_name),
								value_expr,
							]),
						);

						curr_block.js_expressions.push(event_expr);
						continue;
					}

					// handle attribute ifdef
					if (attr_name[attr_name.length - 1] === '?') {
						/** @type {import('estree').Statement} */
						let attr_expr = t.expression_statement(
							t.call_expression(t.identifier('@attr_ifdef'), [
								t.identifier(node_ident),
								t.literal(attr_name.slice(0, -1)),
								value_expr,
							]),
						);

						if (!is_expression_static(value_expr)) {
							attr_expr = t.labeled_statement(t.identifier('$'), attr_expr);
						}

						curr_block.js_expressions.push(attr_expr);
						continue;
					}

					if ((attr_name === 'class' || attr_name === 'style') && attr_value && attr_value.type === 'Expression') {
						let expr = attr_value.expression;

						if (expr.type === 'ObjectExpression') {
							let statics = '';

							let properties = expr.properties;

							for (let i = 0, l = properties.length; i < l; i++) {
								let prop = properties[i];

								if (prop.type === 'SpreadElement') {
									throw create_error(
										`invalid spread in class expression`,
										source,
										// @ts-expect-error
										prop.start,
										// @ts-expect-error
										prop.end,
									);
								}

								let key = prop.key;
								let value = prop.value;

								assert(key.type !== 'PrivateIdentifier');

								if (!prop.computed && key.type === 'Identifier') {
									key = t.literal(key.name);
								}

								if (value.type === 'Literal' && key.type === 'Literal') {
									let name = key.value;
									let actual_value = value.value;

									if (!actual_value) {
										continue;
									}

									if (attr_name === 'class') {
										statics && (statics += ' ');
										statics += name;
									}
									else {
										statics && (statics += ';');
										statics += `${name}:${actual_value}`;
									}

									continue;
								}

								/** @type {import('estree').Statement} */
								let class_toggle_expr = t.expression_statement(
									t.call_expression(t.identifier(attr_name === 'class' ? '@class_toggle' : '@style_set'), [
										t.identifier(node_ident),
										key,
										// @ts-expect-error
										value,
									]),
								);

								// @ts-expect-error
								if (!is_expression_static(value)) {
									class_toggle_expr = t.labeled_statement(t.identifier('$'), class_toggle_expr);
								}

								curr_block.js_expressions.push(class_toggle_expr);
							}

							if (statics) {
								let res = quote_attr(statics);

								curr_block.html += `${needs_space ? ' ' : ''}${attr_name}=${res.value}`;
								needs_space = res.needs_space;
							}

							continue;
						}
					}

					if (is_inline || (attr_value && attr_value.type === 'Expression')) {
						/** @type {import('estree').Statement} */
						let attr_expr = t.expression_statement(
							t.call_expression(t.identifier('@attr'), [
								t.identifier(node_ident),
								t.literal(attr_name),
								value_expr,
							]),
						);

						if (!is_expression_static(value_expr)) {
							attr_expr = t.labeled_statement(t.identifier('$'), attr_expr);
						}

						curr_block.js_expressions.push(attr_expr);
						continue;
					}

					assert(attr_value.type === 'Text');

					let res = quote_attr(attr_value.value);

					curr_block.html += `${needs_space ? ' ' : ''}${attr_name}=${res.value}`;
					needs_space = res.needs_space;
				}

				if (elem_name !== '!') {
					curr_block.html += `>`;
				}

				return;
			}

			if (node.type === 'Expression') {
				assert(parent.type === 'Element' || parent.type === 'Fragment');

				let expr = node.expression;

				// handle named expressions
				if (node.id) {
					let id = node.id;

					throw create_error(
						`unknown named expression: @${id.name}`,
						source,
						// @ts-expect-error
						id.start,
						// @ts-expect-error
						id.end,
					);
				}

				/** @type {import('estree').Identifier} */
				let insert_ident;
				let node_ident = is_sibling_markerable(curr_block, parent, index);

				if (node_ident) {
					insert_ident = t.identifier('@after');
				}
				else if (parent.children.length === 1) {
					let ident = curr_block.node_to_ident.get(parent);
					assert(ident !== undefined);

					insert_ident = t.identifier('@append');
					node_ident = ident;
				}
				else {
					insert_ident = t.identifier('@replace');
					node_ident = create_node_ident(id_n++);

					let traverse_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(node_ident),
							get_traversal_expr(curr_block, parent, index),
						),
					]);

					curr_block.html += `<!>`;
					curr_block.js_traversals.push(traverse_decl);
				}

				curr_block.node_to_ident.set(node, node_ident);

				let text_expr = t.expression_statement(
					t.call_expression(t.identifier('@text'), [
						t.identifier(node_ident),
						t.arrow_function_expression([], expr),
						insert_ident,
					]),
				);

				curr_block.js_expressions.push(text_expr);
				return walk.skip;
			}

			if (node.type === 'LogExpression') {
				let params = node.expressions;

				let expression = t.labeled_statement(
					t.identifier('$'),
					t.expression_statement(
						t.call_expression(
							t.member_expression_from(['console', 'log']),
							params,
						),
					),
				);

				curr_block.js_expressions.push(expression);
				return walk.remove;
			}

			if (node.type === 'LetExpression') {
				let id = node.id;
				let init = node.init;

				let decl = t.variable_declaration('let', [t.variable_declarator(id, init)]);

				// @ts-expect-error
				id.velvet = { computed: true };

				curr_block.js_traversals.push(decl);
				return walk.remove;
			}
		},
		/**
		 * @param {tt.ChildNode | tt.Fragment | tt.Attribute | tt.AttributeSpread} node
		 * @param {tt.ChildNode | tt.Fragment} parent
		 * @param {string} key
		 * @param {number} index
		 */
		leave (node, parent, key, index) {
			if (node.type === 'Fragment') {
				if (!curr_block.html) {
					fragment_to_block.delete(node);

					// @ts-expect-error
					curr_block = block_stack.pop();
					return;
				}

				let template_ident = create_template_ident(curr_block.id);
				let fragment_ident = create_fragment_ident(curr_block.id);

				// if our parent is an svg, then we need to wrap our template, so that
				// they're parsed appropriately as svg.
				let wrapper = get_current(mode_stack);

				if (wrapper) {
					curr_block.html = `<${wrapper}>` + curr_block.html;
				}

				let clone_expr = t.call_expression(t.identifier('@clone'), [t.identifier(template_ident)]);

				let fragment_def = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(fragment_ident),
						clone_expr,
					),
				]);

				clone_expr.leadingComments = [{ type: 'Block', value: '#__PURE__' }];

				if (parent) {
					// reuse the last child as end marker if it's viable
					let last_index = node.children.length - 1;
					let last_child = node.children[last_index];

					/** @type {string} */
					let end_ident;

					if (
						last_child && (
							(last_child.type === 'Text') ||
							(last_child.type === 'Element' && last_child.name !== 'v:element' && last_child.name !== 'v:component')
						)
					) {
						let last_ident = curr_block.node_to_ident.get(last_child);
						assert(typeof last_ident === 'string');

						end_ident = last_ident;
					}
					else {
						end_ident = create_node_ident(id_n++);

						let traverse_decl = t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(end_ident),
								get_traversal_expr(curr_block, node, last_index === -1 ? 0 : last_index + 1),
							),
						]);

						curr_block.html += '<!>';
						curr_block.js_traversals.push(traverse_decl);
					}

					let after_expr = t.expression_statement(
						t.call_expression(t.identifier('@after'), [
							t.identifier('$$root'),
							t.identifier(fragment_ident),
						]),
					);

					let return_stmt = t.return_statement(t.identifier(end_ident));

					curr_block.js_expressions.push(after_expr, return_stmt);
				}
				else {
					let append_expr = t.expression_statement(
						t.call_expression(t.identifier('@append'), [
							t.identifier('$$root'),
							t.identifier(fragment_ident),
						]),
					);

					curr_block.js_expressions.push(append_expr);
				}

				let html = curr_block.html;

				/** @type {import('estree').VariableDeclaration} */
				let template_def;

				if (html_to_template_map.has(html)) {
					let ident = html_to_template_map.get(html);
					assert(typeof ident === 'string');

					template_def = t.variable_declaration('let', [
						t.variable_declarator(
							// don't hoist this template_ident because we could be reusing
							// the template of a child fragment and this would be placed
							// above it
							t.identifier(template_ident),
							t.identifier(ident),
						),
					]);
				}
				else {
					let html_expr = t.call_expression(t.identifier('@html'), [
						t.literal(curr_block.html),
						wrapper && t.literal(!!wrapper),
					]);

					template_def = t.variable_declaration('let', [
						t.variable_declarator(
							// template def has to be hoisted
							t.identifier('%' + template_ident),
							html_expr,
						),
					]);

					html_expr.leadingComments = [{ type: 'Block', value: '#__PURE__' }];
					html_to_template_map.set(html, template_ident);
				}

				curr_block.js_definitions.push(template_def, fragment_def);

				// @ts-expect-error
				curr_block = block_stack.pop();
				return;
			}

			if (node.type === 'Element') {
				assert(parent.type === 'Fragment' || parent.type === 'Element');

				let elem_name = node.name;
				let is_inline = node.inline;
				let is_selfclosing = node.self_closing;

				if (elem_name === 'v:component' || elem_name === 'v:element') {
					let block = curr_block;
					let this_expr = this_exprs.get(node);

					if (!this_expr) {
						throw create_error(
							`expected ${elem_name} to have #this`,
							source,
							node.start,
							node.end,
						);
					}

					// @ts-expect-error
					curr_block = block_stack.pop();

					let block_ident = create_block_ident(block.id);
					let template_ident = create_template_ident(block.id);
					let fragment_ident = create_fragment_ident(block.id);

					let in_ident = inline_to_ident.get(node);
					let out_ident = curr_block.node_to_ident.get(node);

					assert(typeof in_ident === 'string');
					assert(typeof out_ident === 'string');

					let instantiate_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(in_ident),
							elem_name === 'v:component'
								? t.new_expression(t.identifier('%component'))
								: t.call_expression(t.identifier('@create'), [t.identifier('%component')]),
						),
					]);

					let html = block.html;

					/** @type {import('estree').VariableDeclaration} */
					let template_def;

					block.js_traversals.push(instantiate_def);

					if (html) {
						if (html_to_template_map.has(html)) {
							let ident = html_to_template_map.get(html);
							assert(typeof ident === 'string');

							template_def = t.variable_declaration('let', [
								t.variable_declarator(
									// don't hoist this template_ident because we could be reusing
									// the template of a child fragment and this would be placed
									// above it
									t.identifier(template_ident),
									t.identifier(ident),
								),
							]);
						}
						else {
							let html_expr = t.call_expression(t.identifier('@html'), [
								t.literal(html),
							]);

							template_def = t.variable_declaration('let', [
								t.variable_declarator(
									t.identifier('%' + template_ident),
									html_expr,
								),
							]);

							html_expr.leadingComments = [{ type: 'Block', value: '#__PURE__' }];
							html_to_template_map.set(html, template_ident);
						}

						let fragment_def = t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(fragment_ident),
								t.call_expression(t.identifier('@clone'), [
									t.identifier(template_ident),
								]),
							),
						]);

						let append_expr = t.expression_statement(
							t.call_expression(t.identifier('@append'), [
								t.identifier(in_ident),
								t.identifier(fragment_ident),
							]),
						);

						block.js_definitions.push(template_def, fragment_def);
						block.js_expressions.push(append_expr);
					}

					let return_stmt = t.return_statement(t.identifier(out_ident));
					block.js_expressions.push(return_stmt);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('%component')],
								t.block_statement(get_block_js(block)),
							),
						),
					]);

					let dynamic_expr = t.expression_statement(
						t.call_expression(t.identifier('@dynamic'), [
							t.identifier(out_ident),
							t.identifier(block_ident),
							t.arrow_function_expression([], this_expr),
						]),
					);

					curr_block.js_block_defs.push(block_decl);
					curr_block.js_expressions.push(dynamic_expr);
				}
				else if (is_inline) {
					let in_ident = inline_to_ident.get(node);
					let out_ident = curr_block.node_to_ident.get(node);

					assert(typeof in_ident === 'string');
					assert(typeof out_ident === 'string');

					let elem_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(in_ident),
							t.new_expression(
								elem_name === 'v:self'
									? t.member_expression_from(['$$host', 'constructor'])
									: t.identifier(elem_name),
							),
						),
					]);

					let assign_out_ident = t.identifier(out_ident);

					let replace_expr = t.expression_statement(
						t.call_expression(t.identifier('@replace'), [
							t.identifier(out_ident),
							t.assignment_expression(assign_out_ident, t.identifier(in_ident), '='),
							t.literal(true),
						]),
					);

					// @ts-expect-error
					assign_out_ident.velvet = { transformed: true };

					curr_block.js_traversals.push(elem_decl);
					curr_block.js_expressions.push(replace_expr);

					curr_block.html += `</x>`;
				}
				else if (!is_selfclosing) {
					curr_block.html += `</${elem_name}>`;
				}

				pop_mode(mode_stack, elem_name);

				if (!is_inline) {
					ancestor_info_stack.pop();
				}

				return;
			}

			if (node.type === 'ConditionalStatement') {
				assert(parent.type === 'Element' || parent.type === 'Fragment' || parent.type === 'ConditionalStatement');

				let consequent = node.consequent;
				let alternate = node.alternate;

				let consequent_block = fragment_to_block.get(consequent);
				// @ts-expect-error
				let alternate_block = fragment_to_block.get(alternate);

				if (consequent_block) {
					let block_ident = create_block_ident(consequent_block.id);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(get_block_js(consequent_block)),
							),
						),
					]);

					curr_block.js_block_defs.push(block_decl);
				}

				if (alternate_block) {
					let block_ident = create_block_ident(alternate_block.id);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(get_block_js(alternate_block)),
							),
						),
					]);

					curr_block.js_block_defs.push(block_decl);
				}

				// ConditionalStatement can be stacked, `alternate` can contain either a
				// Fragment or ConditionalStatement, we only want to transform the top one
				if (parent.type !== 'ConditionalStatement') {
					let node_ident = is_sibling_markerable(curr_block, parent, index);

					if (!node_ident) {
						node_ident = create_node_ident(id_n++);

						let traverse_decl = t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(node_ident),
								get_traversal_expr(curr_block, parent, index),
							),
						]);

						curr_block.html += `<!>`;
						curr_block.js_traversals.push(traverse_decl);
					}

					curr_block.node_to_ident.set(node, node_ident);

					/** @type {tt.ConditionalStatement[]} */
					let _array = [];
					/** @type {tt.ConditionalStatement['alternate']} */
					let _curr = node;

					while (_curr?.type === 'ConditionalStatement') {
						_array.push(_curr);
						_curr = _curr.alternate;
					}

					/** @type {import('estree').ConditionalExpression | null} */
					let test = null;

					for (let i = _array.length - 1; i >= 0; i--) {
						let next = _array[i];

						let consequent_block = fragment_to_block.get(next.consequent);
						let consequent_ident = consequent_block
							? t.identifier(create_block_ident(consequent_block.id))
							: t.literal(null);

						// @ts-expect-error
						let alternate_block = fragment_to_block.get(next.alternate);
						let alternate_ident = alternate_block
							? t.identifier(create_block_ident(alternate_block.id))
							: t.literal(null);

						test = t.conditional_expression(next.test, consequent_ident, test || alternate_ident);
					}

					assert(test !== null);

					let show_expr = t.expression_statement(
						t.call_expression(t.identifier('@show'), [
							t.identifier(node_ident),
							t.arrow_function_expression([], test),
						]),
					);

					curr_block.js_expressions.push(show_expr);
				}

				return;
			}

			if (node.type === 'LoopStatement') {
				assert(parent.type === 'Element' || parent.type === 'Fragment');

				let keyed = node.keyed;
				let alternate = node.alternate;

				let main_block = fragment_to_block.get(node.body);

				/** @type {string | undefined} */
				let alternate_ident;
				let alternate_block = alternate && fragment_to_block.get(alternate);

				let node_ident = is_sibling_markerable(curr_block, parent, index);

				if (!node_ident) {
					node_ident = create_node_ident(id_n++);

					let traverse_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(node_ident),
							get_traversal_expr(curr_block, parent, index),
						),
					]);

					curr_block.html += `<!>`;
					curr_block.js_traversals.push(traverse_decl);
				}

				curr_block.node_to_ident.set(node, node_ident);

				if (alternate_block) {
					alternate_ident = create_block_ident(alternate_block.id);

					let alternate_block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(alternate_ident),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(get_block_js(alternate_block)),
							),
						),
					]);

					curr_block.js_block_defs.push(alternate_block_decl);
				}

				if (!main_block) {
					if (alternate_ident) {
						let show_expr = t.expression_statement(
							t.call_expression(t.identifier('@show'), [
								t.identifier(node_ident),
								t.arrow_function_expression(
									[],
									t.conditional_expression(
										t.binary_expression(
											t.member_expression(node.expression, t.identifier('length')),
											t.literal(1),
											'<',
										),
										t.identifier(alternate_ident),
										t.literal(null),
									),
								),
							]),
						);

						curr_block.js_expressions.push(show_expr);
					}
					else {
						let effect_expr = t.labeled_statement(t.identifier('$'), t.expression_statement(node.expression));

						curr_block.js_expressions.push(effect_expr);
					}

					return;
				}

				let block_ident = create_block_ident(main_block.id);

				let local = node.local;
				let local_index = node.index;

				// @ts-expect-error indicate to script transformer that this is a ref
				local.velvet = { ref: true };

				if (local_index && keyed) {
					// @ts-expect-error indicate to script transformer that this is a ref
					local_index.velvet = { ref: true };
				}

				let block_decl = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(block_ident),
						t.arrow_function_expression(
							[t.identifier('$$root'), local, local_index],
							t.block_statement(get_block_js(main_block)),
						),
					),
				]);

				let each_expr = t.expression_statement(
					t.call_expression(t.identifier(!keyed ? '@each' : '@keyed_each'), [
						t.identifier(node_ident),
						t.identifier(block_ident),
						t.arrow_function_expression([], node.expression),
						keyed ? t.arrow_function_expression([t.identifier(local.name)], keyed) : null,
						alternate_ident ? t.identifier(alternate_ident) : null,
					]),
				);

				curr_block.js_block_defs.push(block_decl);
				curr_block.js_expressions.push(each_expr);
				return;
			}

			if (node.type === 'AwaitStatement') {
				assert(parent.type === 'Element' || parent.type === 'Fragment');

				let node_ident = is_sibling_markerable(curr_block, parent, index);

				if (!node_ident) {
					node_ident = create_node_ident(id_n++);

					let traverse_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(node_ident),
							get_traversal_expr(curr_block, parent, index),
						),
					]);

					curr_block.html += `<!>`;
					curr_block.js_traversals.push(traverse_decl);
				}

				curr_block.node_to_ident.set(node, node_ident);

				// @ts-expect-error
				let pending_block = fragment_to_block.get(node.pending);
				// @ts-expect-error
				let resolved_block = fragment_to_block.get(node.resolved?.body);
				// @ts-expect-error
				let rejected_block = fragment_to_block.get(node.rejected?.body);

				/** @type {import('estree').Identifier | import('estree').Literal} */
				let pending_ident = t.literal(null);
				/** @type {import('estree').Identifier | import('estree').Literal} */
				let resolved_ident = t.literal(null);
				/** @type {import('estree').Identifier | import('estree').Literal} */
				let rejected_ident = t.literal(null);

				if (pending_block) {
					let block_ident = create_block_ident(pending_block.id);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(get_block_js(pending_block)),
							),
						),
					]);

					pending_ident = t.identifier(block_ident);
					curr_block.js_block_defs.push(block_decl);
				}

				if (resolved_block) {
					let block_ident = create_block_ident(resolved_block.id);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(get_block_js(resolved_block)),
							),
						),
					]);

					resolved_ident = t.identifier(block_ident);
					curr_block.js_block_defs.push(block_decl);
				}

				if (rejected_block) {
					let block_ident = create_block_ident(rejected_block.id);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(get_block_js(rejected_block)),
							),
						),
					]);

					rejected_ident = t.identifier(block_ident);
					curr_block.js_block_defs.push(block_decl);
				}

				// ideally we would return if all the blocks are null, but promises
				// are side-effecting so that's a no go.

				let promise_expr = t.expression_statement(
					t.call_expression(t.identifier('@promise'), [
						t.identifier(node_ident),
						pending_ident,
						resolved_ident,
						rejected_ident,
						t.arrow_function_expression([], node.argument),
					]),
				);

				curr_block.js_expressions.push(promise_expr);
				return;
			}

			if (node.type === 'KeyedStatement') {
				assert(parent.type === 'Element' || parent.type === 'Fragment');

				let node_ident = is_sibling_markerable(curr_block, parent, index);

				if (!node_ident) {
					node_ident = create_node_ident(id_n++);

					let traverse_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(node_ident),
							get_traversal_expr(curr_block, parent, index),
						),
					]);

					curr_block.html += `<!>`;
					curr_block.js_traversals.push(traverse_decl);
				}

				curr_block.node_to_ident.set(node, node_ident);

				let block = fragment_to_block.get(node.body);

				if (!block) {
					let effect_expr = t.labeled_statement(t.identifier('$'), t.expression_statement(node.argument));
					curr_block.js_expressions.push(effect_expr);
					return;
				}

				let block_ident = create_block_ident(block.id);

				let block_decl = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(block_ident),
						t.arrow_function_expression(
							[t.identifier('$$root')],
							t.block_statement(get_block_js(block)),
						),
					),
				]);

				let key_expr = t.expression_statement(
					t.call_expression(t.identifier('@keyed'), [
						t.identifier(node_ident),
						t.identifier(block_ident),
						t.arrow_function_expression([], node.argument),
					]),
				);

				curr_block.js_block_defs.push(block_decl);
				curr_block.js_expressions.push(key_expr);
				return;
			}
		},
	});

	return t.program(get_block_js(main_block));
}

/**
 * @param {number} id
 * @returns {Block}
 */
function create_block (id) {
	return {
		id: id,
		html: '',
		node_to_ident: new Map([]),
		js_definitions: [],
		js_traversals: [],
		js_block_defs: [],
		js_expressions: [],
	};
}

/**
 * @param {Block} block
 * @returns {any[]}
 */
function get_block_js (block) {
	return [
		...block.js_definitions,
		...block.js_traversals,
		...block.js_block_defs,
		...block.js_expressions,
	];
}

/**
 * @param {Block} block
 * @param {tt.Element | tt.Fragment} parent
 * @param {number} index
 * @returns {import('estree').CallExpression}
 */
function get_traversal_expr (block, parent, index) {
	if (index === 0) {
		let parent_ident = block.node_to_ident.get(parent);
		assert(typeof parent_ident === 'string');

		let node = t.call_expression(t.identifier('@first_child'), [t.identifier(parent_ident)]);
		node.leadingComments = [{ type: 'Block', value: '#__PURE__' }];

		return node;
	}
	else {
		let prev_sibling = parent.children[index - 1];
		let prev_ident = block.node_to_ident.get(prev_sibling);
		assert(typeof prev_ident === 'string');

		let node = t.call_expression(t.identifier('@next_sibling'), [t.identifier(prev_ident)]);
		node.leadingComments = [{ type: 'Block', value: '#__PURE__' }];

		return node;
	}
}

/**
 * Whether its previous sibling can be used as a marker for expressions or statements,
 * will return the identifier for previous sibling if so
 * @param {Block} block
 * @param {tt.Element | tt.Fragment} parent
 * @param {number} index
 * @returns {string | null}
 */
function is_sibling_markerable (block, parent, index) {
	let prev_sibling = parent.children[index - 1];
	let next_sibling = parent.children[index + 1];

	if (
		prev_sibling && (
			(prev_sibling.type === 'Text' && (!next_sibling || next_sibling.type !== 'Text')) ||
			(prev_sibling.type === 'Element' && prev_sibling.name !== 'v:element' && prev_sibling.name !== 'v:component')
		)
	) {
		const ident = block.node_to_ident.get(prev_sibling);
		assert(typeof ident === 'string');

		return ident;
	}

	return null;
}

/**
 * @param {string} value
 */
function quote_attr (value) {
	let has_dq = false;
	let has_sq = false;
	let needs_quote = false;

	for (let i = 0, l = value.length; i < l; i++) {
		let ch = value[i];

		if (ch === '"') {
			has_dq = true;
			needs_quote = true;
		}

		if (ch === '\'') {
			has_sq = true;
			needs_quote = true;
		}

		if (
			ch === ' ' ||
			ch === '\t' ||
			ch === '\n' ||
			ch === '\r' ||
			ch === '`' ||
			ch === '=' ||
			ch === '<' ||
			ch === '>'
		) {
			needs_quote = true;
		}
	}

	if (needs_quote) {
		let wrapper = '\'';

		if (has_dq && has_sq) {
			wrapper = '\'';
			value = value.replace(/'/g, '&#39;');
		}
		else if (has_dq) {
			// do nothing.
			// wrapper = "'";
		}
		else if (has_sq) {
			wrapper = '"';
		}

		value = `${wrapper}${value}${wrapper}`;
	}

	return {
		needs_space: !needs_quote,
		value,
	};
}

/**
 * @param {import('./utils/template_parser.js').ParseMode[]} stack
 * @param {string} elem_name
 */
function push_mode (stack, elem_name) {
	// handle special-handled elements, these needs to be wrapped,
	// save for `foreignObject` where it's supposed to be handling HTML-in-SVG/XML.
	if (elem_name === 'svg' || elem_name === 'math') {
		stack.push(elem_name);
	}
	else if (elem_name === 'foreignObject') {
		stack.push(false);
	}
}

/**
 * @param {import('./utils/template_parser.js').ParseMode[]} stack
 * @param {string} elem_name
 */
function pop_mode (stack, elem_name) {
	if (elem_name === 'svg' || elem_name === 'math' || elem_name === 'foreignObject') {
		stack.pop();
	}
}

/**
 * Create identifier for markers
 * @param {number} id
 * @returns {string}
 */
function create_block_ident (id) {
	return `%block` + id;
}

/**
 * Create identifier for HTML node traversal
 * @param {number} id
 * @returns {string}
 */
function create_node_ident (id) {
	return `%child` + id;
}

/**
 * @param {number} id
 * @returns {string}
 */
function create_fragment_ident (id) {
	return `%fragment` + id;
}

/**
 * @param {number} id
 * @returns {string}
 */
function create_template_ident (id) {
	return `%template` + id;
}

/**
 * @param {number} id
 * @returns {string}
 */
function create_ref_ident (id) {
	return `%ref` + id;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} [cursor]
 * @returns {T}
 */
function get_current (arr, cursor = 0) {
	return arr[arr.length - 1 - cursor];
}

/**
 * @param {import('estree').Expression} node
 * @returns {boolean}
 */
function is_expression_static (node) {
	let leading_comments = node.leadingComments;

	if (leading_comments && leading_comments.length > 0) {
		let comment = leading_comments[0];
		let value = comment.value.trim();

		return value === '@once';
	}

	return false;
}
