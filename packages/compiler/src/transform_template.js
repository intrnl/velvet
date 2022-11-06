import { walk } from './utils/walker.js';
import * as t from './utils/js_types.js';
import * as tt from './utils/template_types.js';
import { create_error } from './utils/error.js';


const HTML_NO_COLLAPSE = new Set([
	// Whitespace-sensitive tags
	'textarea', 'code', 'pre',
]);

const HTML_TRIM_EDGE = new Set([
	// Content tags
	'address', 'audio', 'button', 'canvas', 'caption', 'figcaption', 'h1', 'h2',
	'h3', 'h4', 'h5', 'h6', 'legend', 'meter', 'object', 'option', 'p', 'summary',
	'video',

	// Content-first tags
	'dd', 'details', 'dt', 'iframe', 'label', 'li', 'noscript', 'output',
	'progress', 'slot', 'td', 'template', 'th',

	// Layout tags
	'article', 'aside', 'blockquote', 'body', 'colgroup', 'datalist', 'dialog',
	'div', 'dl', 'fieldset', 'figure', 'footer', 'form', 'head', 'header',
	'hgroup', 'html', 'main', 'map', 'menu', 'nav', 'ol', 'optgroup', 'picture',
	'section', 'select', 'table', 'tbody', 'tfoot', 'thead', 'tr', 'ul',
	'foreignObject',
]);

const HTML_TRIM_INNER = new Set([
	// Layout tags
	'article', 'aside', 'blockquote', 'body', 'colgroup', 'datalist', 'dialog',
	'div', 'dl', 'fieldset', 'figure', 'footer', 'form', 'head', 'header',
	'hgroup', 'html', 'main', 'map', 'menu', 'nav', 'ol', 'optgroup', 'picture',
	'section', 'select', 'table', 'tbody', 'tfoot', 'thead', 'tr', 'ul',
	'foreignObject',
]);

const SVG_NO_TRIM_EDGE = new Set([
	// Formatting tags
	'a', 'altGlyph', 'tspan', 'textPath', 'tref',
]);

const SVG_NO_TRIM_INNER = new Set([
	// Content tags
	'desc', 'text', 'title',

	// Formatting tags
	'a', 'altGlyph', 'tspan', 'textPath', 'tref',
]);

export function transform_template (template, source) {
	let blocks = [];

	let block_stack = [];
	let curr_block;

	let program = create_scope();
	let scope_stack = [];
	let curr_scope = program;

	let fragment_to_block = new Map();
	let fragment_to_scope = new Map();

	let child_to_ident = new Map();
	let node_offsets = new Map();

	let wrap_stack = [false];

	// increment to create unique identifier names
	let id_c = 0;
	let id_m = 0;

	walk(template, {
		/**
		 * @param {import('./utils/template_types.js').Node} node
		 * @param {import('./utils/template_types.js').Node} parent
		 * @param {string} key
		 * @param {number} index
		 */
		enter (node, parent, key, index) {
			// handle element node
			if (node.type === 'Element') {
				let index_offset = node_offsets.get(parent) || 0;
				curr_block.indices.push(index + index_offset);

				let elem_name = node.name;
				let is_inline = node.inline;
				let is_selfclosing = node.self_closing;

				// handle special-handled elements, these needs to be wrapped,
				// save for `foreignObject` where it's supposed to be handling HTML-in-SVG/XML.
				if (elem_name === 'svg' || elem_name === 'math') {
					wrap_stack.push(elem_name);
				}
				else if (elem_name === 'foreignObject') {
					wrap_stack.push(false);
				}

				// v:component and v:element lives in a new block
				if (elem_name === 'v:component' || elem_name === 'v:element') {
					curr_block.html += '<!>';

					block_stack.push(curr_block);
					blocks.push(curr_block = create_block());

					scope_stack.push(curr_scope);
					curr_scope = create_scope();
					return;
				}

				// inline elements lives in the same block, to do that we need to
				// masquerade as a regular html element, in this case a div.
				if (is_inline) {
					curr_block.html += '<x>';
					return;
				}

				// do some special handling for table, which can create new elements
				// implicitly
				if (elem_name === 'table') {
					let children = node.children;

					let start_idx = -1;
					let end_idx = -1;

					for (let i = 0, l = children.length; i < l; i++) {
						let child = children[i];

						if (child.type !== 'Element') {
							continue;
						}

						if (child.name === 'tr') {
							if (start_idx === -1) {
								start_idx = i;
							}

							end_idx = l;
						}

						if (child.name === 'tbody') {
							if (start_idx !== -1) {
								end_idx = i - 1;
							}
						}
					}

					if (start_idx !== -1) {
						let tbody = tt.element('tbody', false, [], null);
						let implicit_children = children.splice(start_idx, end_idx - start_idx + 1, tbody);

						tbody.children = implicit_children;
					}
				}

				let attributes = node.attributes;
				let needs_space = true;

				curr_block.html += `<${elem_name}`;

				for (let i = 0, l = attributes.length; i < l; i++) {
					let attr = attributes[i];

					// skip attribute spread
					if (attr.type === 'AttributeSpread') {
						continue;
					}

					let attr_name = attr.name;
					let attr_value = attr.value;

					// skip any special attributes, or attributes containing expression
					let is_prop = attr_name[0] === '.';
					let is_toggle = attr_name[0] === '?';
					let is_listen = attr_name[0] === '@';
					let is_bind = attr_name[0] === ':';
					let is_ifdef = attr_name[attr_name.length - 1] === '?';

					let is_expr = attr_value && attr_value.type !== 'Text';

					if (is_prop || is_toggle || is_listen || is_bind || is_ifdef || is_expr) {
						continue;
					}

					curr_block.html += `${needs_space ? ' ' : ''}${attr_name}`;

					let value = attr_value && attr_value.value;

					if (value) {
						// unquote attributes when possible

						let has_dq = false;
						let has_sq = false;
						let needs_quote = false;

						for (let i = 0, l = value.length; i < l; i++) {
							let ch = value[i];

							if (ch === '"') {
								has_dq = true;
								needs_quote = true;
							}

							if (ch === "'") {
								has_sq = true;
								needs_quote = true;
							}

							if (
								ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' ||
								ch === '`' || ch === '=' || ch === '<' || ch === '>'
							) {
								needs_quote = true;
							}
						}

						if (needs_quote) {
							let wrapper = "'";

							if (has_dq && has_sq) {
								wrapper = "'";
								value = value.replace(/'/g, '&#39;');
							}
							else if (has_dq) {
								// do nothing.
								// wrapper = "'";
							}
							else if (has_sq) {
								wrapper = '"';
							}

							needs_space = false;
							curr_block.html += `=${wrapper}${value}${wrapper}`;
						}
						else {
							needs_space = true;
							curr_block.html += `=${value}`;
						}
					}
					else {
						needs_space = i !== l - 1;
					}
				}

				if (is_selfclosing && get_current(wrap_stack) !== false) {
					curr_block.html += `${needs_space ? ' ' : ''}/>`;
				}
				else {
					curr_block.html += `>`;
				}

				return;
			}

			// handle fragment node
			if (node.type === 'Fragment') {
				block_stack.push(curr_block);
				blocks.push(curr_block = create_block());
				fragment_to_block.set(node, curr_block);

				// curr_scope is already set for root fragment
				if (parent) {
					scope_stack.push(curr_scope);
					curr_scope = create_scope();
					fragment_to_scope.set(node, curr_scope);
				}

				return;
			}
		},
		/**
		 * @param {import('./utils/template_types.js').Node} node
		 * @param {import('./utils/template_types.js').Node} parent
		 * @param {string} key
		 * @param {number} index
		 */
		leave (node, parent, key, index) {
			// remove comment node
			if (node.type === 'Comment') {
				return walk.remove;
			}

			// handle text node
			if (node.type === 'Text' && parent.type !== 'Attribute') {
				let value = node.value;

				let parent_type = parent.type;

				let next_node = parent.children[index + 1];
				let next_type = next_node && next_node.type;

				// merge if next children is a text node
				if (next_type === 'Text') {
					next_node.value = value + next_node.value;
					return walk.remove;
				}

				// or if next children is a comment node and a text node
				if (next_type === 'Comment') {
					let next_next_node = parent.children[index + 2];
					let next_next_type = next_next_node && next_next_node.type;

					if (next_next_type === 'Text') {
						next_next_node.value = value + next_next_node.value;
						return walk.remove;
					}
				}

				// default to destroying any sort of whitespace if we're not on HTML.
				// TODO(intrnl): how should this be applied to MathML?
				let wrapper = get_current(wrap_stack);

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
				else if (parent_type !== 'Element') {
					// if we're on any other fragments though, let's just trim the edges
					should_trim_edge = true;
				}
				else if (wrapper === 'svg') {
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

				curr_block.html += value;
				return;
			}

			// handle expression node
			if (node.type === 'Expression' && parent.type !== 'Attribute') {
				let expr = node.expression;

				// handle named expressions
				if (node.id) {
					let id = node.id;

					throw create_error(
						`unknown named expression: @${id.name}`,
						source,
						id.start,
						id.end,
					);
				}

				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);

				// we don't need to create a marker if we're the only children here.
				if (parent.type === 'Element' && parent.children.length === 1) {
					let node_ident = child_to_ident.get(parent);
					let need_traverse = false;

					if (!node_ident) {
						node_ident = '%child' + (id_c++);
						child_to_ident.set(parent, node_ident);

						need_traverse = true;
					}

					if (need_traverse) {
						let traverse_def = t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(node_ident),
								t.call_expression(t.identifier('@traverse'), [
									t.identifier(fragment_ident),
									t.array_expression([...curr_block.indices].map((idx) => t.literal(idx))),
								]),
							),
						]);

						curr_scope.traversals.push(traverse_def);
					}

					let text_expr = t.expression_statement(
						t.call_expression(t.identifier('@text'), [
							t.identifier(node_ident),
							t.arrow_function_expression([], expr),
						]),
					);

					curr_scope.expressions.push(text_expr);
					return;
				}

				// text expression
				let marker_ident = '%marker' + (id_m++);

				curr_block.html += '<!>';

				let traverse_def = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(marker_ident),
						t.call_expression(t.identifier('@traverse'), [
							t.identifier(fragment_ident),
							t.array_expression([...curr_block.indices, index].map((idx) => t.literal(idx))),
						]),
					),
				]);

				let text_expr = t.expression_statement(
					t.call_expression(t.identifier('@text'), [
						t.identifier(marker_ident),
						t.arrow_function_expression([], expr),
					]),
				);

				curr_scope.traversals.push(traverse_def);
				curr_scope.expressions.push(text_expr);
				return;
			}

			// handle log expression
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

				curr_scope.expressions.push(expression);
				return walk.remove;
			}

			// handle let expression
			if (node.type === 'LetExpression') {
				let id = node.id;
				let init = node.init;

				let decl = t.variable_declaration('let', [t.variable_declarator(id, init)]);

				id.velvet = { computed: true };

				curr_scope.traversals.push(decl);
				return walk.remove;
			}

			// handle element node
			if (node.type === 'Element') {
				let elem_name = node.name;
				let is_inline = node.inline;
				let is_selfclosing = node.self_closing;

				// we only increment child counter if we've indeed used it.
				let need_ident = false;
				let elem_ident = '%child' + (id_c);
				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);

				let attributes = node.attributes;

				// holds expression from #this attribute to instantiate v:component
				let _this_expr;

				// checks for properties and bindings
				let is_input = elem_name === 'input';
				let is_textarea = elem_name === 'textarea';
				let is_select = elem_name === 'select';

				let input_type = null;

				if (is_input) {
					for (let i = 0, l = attributes.length; i < l; i++) {
						let attr = attributes[i];

						if (attr.name === 'type' && attr.value && attr.value.type === 'Text') {
							input_type = attr.value.decoded;
							break;
						}
					}
				}

				if (elem_name === 'svg' || elem_name === 'math' || elem_name === 'foreignObject') {
					// we're leaving this element, so pop the values we've made earlier
					wrap_stack.pop();
				}

				// loop through attributes
				for (let i = 0, l = attributes.length; i < l; i++) {
					let attr = attributes[i];

					// handle attribute spread
					if (attr.type === 'AttributeSpread') {
						need_ident = true;

						let test_expr = t.labeled_statement(
							t.identifier('$'),
							t.expression_statement(
								t.call_expression(t.identifier('@assign'), [
									t.identifier(elem_ident),
									attr.expression,
								]),
							),
						);

						curr_scope.expressions.push(test_expr);
						continue;
					}

					// handle log expression
					if (attr.type === 'LogExpression') {
						throw create_error(
							`{@log ...} cannot be used within attributes`,
							source,
							attr.start,
							attr.end,
						);
					}

					// handle let expression
					if (attr.type === 'LetExpression') {
						throw create_error(
							`{@let ...} cannot be used within attributes`,
							source,
							attr.start,
							attr.end,
						);
					}

					let attr_name = attr.name;
					let attr_value = attr.value;

					let value_expr = attr_value
						? attr_value.type === 'Text'
							? t.literal(attr_value.decoded)
							: attr_value.expression
						: t.literal(true);

					// handle #this attribute
					if (attr_name === '#this') {
						if (elem_name !== 'v:component' && elem_name !== 'v:element') {
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

						_this_expr = value_expr;
						continue;
					}

					// handle #ref attribute
					if (attr_name === '#ref') {
						if (
							!attr_value ||
							attr_value.type === 'Text' ||
							(value_expr.type !== 'Identifier' && value_expr.type !== 'MemberExpression')
						) {
							let start = attr_value && attr_value.type !== 'Text' ? value_expr.start : attr.start;
							let end = attr_value && attr_value.type !== 'Text' ? value_expr.end : attr.end;

							throw create_error(
								`expected #ref to have an identifier or member expression`,
								source,
								start,
								end,
							);
						}

						need_ident = true;

						let ref_expr = t.expression_statement(
							t.assignment_expression(
								value_expr,
								t.identifier(elem_ident),
							),
						);

						curr_scope.expressions.push(ref_expr);
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

						need_ident = true;

						let identifier;
						let argument;

						if (value_expr.type === 'ArrayExpression') {
							let elements = value_expr.elements;
							let length = elements.length;

							if (length < 1) {
								throw create_error(
									`expected #use to have at least 1 argument, but only ${length} were passed`,
									source,
									value_expr.start,
									value_expr.end,
								);
							}
							if (length > 2) {
								throw create_error(
									`expected #use to have not more than 2 argument, ${length} were passed`,
									source,
									elements[2].start,
									elements[length - 1].end,
								);
							}

							identifier = elements[0];
							argument = length > 1 ? elements[1] : null;
						}
						else {
							identifier = value_expr;
							argument = null;
						}

						let use_expr = t.expression_statement(
							t.call_expression(t.identifier('@use'), [
								t.identifier(elem_ident),
								identifier,
								argument ? t.arrow_function_expression([], argument) : t.literal(null),
							]),
						);

						curr_scope.expressions.push(use_expr);
						continue;
					}

					// handle properties and bindings
					let is_prop = attr_name[0] === '.';
					let is_binding = attr_name[0] === ':';

					if (is_binding) {
						if (
							!attr_value ||
							attr_value.type === 'Text' ||
							(value_expr.type !== 'Identifier' && value_expr.type !== 'MemberExpression')
						) {
							let start = attr_value && attr_value.type !== 'Text' ? value_expr.start : attr.start;
							let end = attr_value && attr_value.type !== 'Text' ? value_expr.end : attr.end;

							throw create_error(
								`expected binding to have an identifier or member expression`,
								source,
								start,
								end,
							);
						}
					}

					if (is_prop || is_binding) {
						need_ident = true;

						let prop_name = attr_name.slice(1);

						// handle special checkbox group binding
						if (is_input && input_type === 'checkbox' && prop_name === 'group') {
							let prop_expr = t.labeled_statement(
								t.identifier('$'),
								t.expression_statement(
									t.assignment_expression(
										t.member_expression_from([elem_ident, 'checked']),
										t.call_expression(
											t.member_expression(value_expr, t.identifier('includes')),
											[t.member_expression_from([elem_ident, 'value'])],
										),
									),
								),
							);

							curr_scope.expressions.push(prop_expr);
						}
						// handle special radio group binding
						else if (is_input && input_type === 'radio' && prop_name === 'group') {
							let prop_expr = t.labeled_statement(
								t.identifier('$'),
								t.expression_statement(
									t.assignment_expression(
										t.member_expression_from([elem_ident, 'checked']),
										t.binary_expression(
											value_expr,
											t.member_expression_from([elem_ident, 'value']),
											'===',
										),
									),
								),
							);

							curr_scope.expressions.push(prop_expr);
						}
						// handle special select value binding
						else if (is_select && prop_name === 'value') {
							let prop_expr = t.labeled_statement(
								t.identifier('$'),
								t.expression_statement(
									t.call_expression(t.identifier('@set_select_values'), [
										t.identifier(elem_ident),
										value_expr,
									]),
								),
							);

							curr_scope.expressions.push(prop_expr);
						}
						else {
							let prop_expr = t.labeled_statement(
								t.identifier('$'),
								t.expression_statement(
									t.assignment_expression(
										t.member_expression(t.identifier(elem_ident), t.literal(prop_name), true),
										value_expr,
									),
								),
							);

							curr_scope.expressions.push(prop_expr);
						}

						if (is_binding) {
							let event_name = `update:${prop_name}`;

							let event_fn;

							// handle checkbox group binding
							if (is_input && input_type === 'checkbox' && prop_name === 'group') {
								event_name = 'input';

								event_fn = t.arrow_function_expression([], t.assignment_expression(
									t.clone(value_expr),
									t.call_expression(t.identifier('@get_checked_values'), [
										t.clone(value_expr),
										t.member_expression_from([elem_ident, 'value']),
										t.member_expression_from([elem_ident, 'checked']),
									]),
								));
							}
							else if (is_input && input_type === 'radio' && prop_name === 'group') {
								event_name = 'input';

								event_fn = t.arrow_function_expression([], t.assignment_expression(
									t.clone(value_expr),
									t.member_expression_from([elem_ident, 'value']),
								));
							}
							// handle select value binding
							else if (is_select && prop_name === 'value') {
								event_name = 'input';

								event_fn = t.arrow_function_expression([], t.assignment_expression(
									t.clone(value_expr),
									t.call_expression(t.identifier('@get_select_values'), [
										t.identifier(elem_ident),
									]),
								));
							}
							// handle input number binding
							else if (is_input && input_type === 'number' && prop_name === 'value') {
								event_name = 'input';

								event_fn = t.arrow_function_expression([], t.assignment_expression(
									t.clone(value_expr),
									t.call_expression(t.identifier('@to_number'), [
										t.member_expression_from([elem_ident, 'value']),
									]),
								));
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

								event_fn = t.arrow_function_expression([], t.assignment_expression(
									t.clone(value_expr),
									t.member_expression_from([elem_ident, prop_name]),
								));
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

								event_fn = t.arrow_function_expression([], t.assignment_expression(
									t.clone(value_expr),
									t.member_expression_from([elem_ident, prop_name]),
								));
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
									t.identifier(elem_ident),
									t.literal(event_name),
									event_fn,
								]),
							);

							curr_scope.expressions.push(event_expr);
						}

						continue;
					}

					// handle attribute toggle
					let is_toggle = attr_name[0] === '?';

					if (is_toggle || (is_inline && !attr_value)) {
						need_ident = true;

						let toggle_name = is_toggle ? attr_name.slice(1) : attr_name;

						let toggle_expr = t.labeled_statement(
							t.identifier('$'),
							t.expression_statement(
								t.call_expression(t.identifier('@toggle'), [
									t.identifier(elem_ident),
									t.literal(toggle_name),
									value_expr,
								]),
							),
						);

						curr_scope.expressions.push(toggle_expr);
						continue;
					}

					// handle events
					if (attr_name[0] === '@') {
						need_ident = true;

						let event_name = attr_name.slice(1);

						let event_expr = t.expression_statement(
							t.call_expression(t.identifier('@on'), [
								t.identifier(elem_ident),
								t.literal(event_name),
								value_expr,
							]),
						);

						curr_scope.expressions.push(event_expr);
						continue;
					}

					// handle attribute ifdef
					if (attr_name[attr_name.length - 1] === '?') {
						need_ident = true;

						let attr_expr = t.labeled_statement(
							t.identifier('$'),
							t.expression_statement(
								t.call_expression(t.identifier('@attr_ifdef'), [
									t.identifier(elem_ident),
									t.literal(attr_name.slice(0, -1)),
									value_expr,
								]),
							),
						);

						curr_scope.expressions.push(attr_expr);
						continue;
					}

					let is_expression = attr_value && attr_value.type !== 'Text';

					if (is_expression) {
						if (attr_name === 'class' && attr_value.expression.type === 'ObjectExpression') {
							let obj = attr_value.expression;

							let static_name = '';
							let exprs = [];
							let properties = obj.properties;

							for (let i = 0, l = properties.length; i < l; i++) {
								let prop = properties[i];

								if (prop.type === 'SpreadElement') {
									throw create_error(
										`invalid spread in class expression`,
										source,
										prop.start,
										prop.end,
									);
								}

								let is_computed = prop.computed && prop.key.type !== 'Literal';
								let prop_name = prop.key.type === 'Literal' ? prop.key.value : prop.key.name;
								let prop_value = prop.value;

								if (prop_value.type === 'Literal') {
									let value = prop_value.value;

									if (!value) {
										continue;
									}

									if (!is_computed) {
										static_name && (static_name += ' ');
										static_name += `${prop_name}`;
										continue;
									}
								}

								let class_expr = t.expression_statement(
									t.call_expression(t.identifier('@class_toggle'), [
										t.identifier(elem_ident),
										prop.computed ? prop.key : t.literal(prop_name),
										prop_value,
									]),
								);

								if (!is_computed) {
									class_expr = t.labeled_statement(
										t.identifier('$'),
										class_expr,
									);
								}

								need_ident = true;
								exprs.push(class_expr);
							}

							if (static_name) {
								let class_expr = t.expression_statement(
									t.call_expression(t.identifier('@attr'), [
										t.identifier(elem_ident),
										t.literal('class'),
										t.literal(static_name),
									]),
								);

								need_ident = true;
								curr_scope.expressions.push(class_expr);
							}

							curr_scope.expressions.push(...exprs);
							continue;
						}

						if (attr_name === 'style' && attr_value.expression.type === 'ObjectExpression') {
							let obj = attr_value.expression;

							let static_styles = '';
							let exprs = [];
							let properties = obj.properties;

							for (let i = 0, l = properties.length; i < l; i++) {
								let prop = properties[i];

								if (prop.type === 'SpreadElement') {
									throw create_error(
										`invalid spread in style expression`,
										source,
										prop.start,
										prop.end,
									);
								}

								let is_computed = prop.computed && prop.key.type !== 'Literal';
								let prop_name = prop.key.type === 'Literal' ? prop.key.value : prop.key.name;
								let prop_value = prop.value;

								if (prop_value.type === 'Literal') {
									let value = prop_value.value;

									if (value === null) {
										continue;
									}

									if (!is_computed) {
										static_styles && (static_styles += ';');
										static_styles += `${prop_name}:${prop_value.value}`;
										continue;
									}
								}

								let style_expr = t.expression_statement(
									t.call_expression(t.identifier('@style_set'), [
										t.identifier(elem_ident),
										prop.computed ? prop.key : t.literal(prop_name),
										prop_value,
									]),
								);

								if (!is_computed) {
									style_expr = t.labeled_statement(
										t.identifier('$'),
										style_expr,
									);
								}

								need_ident = true;
								exprs.push(style_expr);
							}

							if (static_styles) {
								let style_expr = t.expression_statement(
									t.call_expression(t.identifier('@attr'), [
										t.identifier(elem_ident),
										t.literal('style'),
										t.literal(static_styles),
									]),
								);

								need_ident = true;
								curr_scope.expressions.push(style_expr);
							}

							curr_scope.expressions.push(...exprs);
							continue;
						}
					}

					if (is_inline || is_expression) {
						need_ident = true;

						let attr_expr = t.labeled_statement(
							t.identifier('$'),
							t.expression_statement(
								t.call_expression(t.identifier('@attr'), [
									t.identifier(elem_ident),
									t.literal(attr_name),
									value_expr,
								]),
							),
						);

						curr_scope.expressions.push(attr_expr);
						continue;
					}
				}

				if (need_ident && !is_inline) {
					id_c++;
					child_to_ident.set(node, elem_ident);

					let decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(elem_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(fragment_ident),
								t.array_expression(curr_block.indices.map((i) => t.literal(i))),
							]),
						),
					]);

					curr_scope.traversals.push(decl);
				}
				else if (elem_name === 'v:component' || elem_name === 'v:element') {
					id_c++;
					child_to_ident.set(node, elem_ident);

					let block = curr_block;
					let scope = curr_scope;

					let is_component = elem_name === 'v:component';

					curr_block = block_stack.pop();
					curr_scope = scope_stack.pop();

					if (!_this_expr) {
						throw create_error(
							`expected ${elem_name} to have #this`,
							source,
							node.start,
							node.end,
						);
					}

					let instantiate_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(elem_ident),
							is_component
								? t.new_expression(t.identifier('%component'))
								: t.call_expression(t.identifier('@create'), [t.identifier('%component')]),
						),
					]);


					scope.traversals.push(instantiate_def);

					let block_ident = '%block' + blocks.indexOf(block);
					let template_ident = '%template' + blocks.indexOf(block);
					let fragment_ident = '%fragment' + blocks.indexOf(block);
					let marker_ident = '%marker' + (id_m++);

					let has_length = block.html;

					if (has_length) {
						let template_def = t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier('%' + template_ident),
								t.call_expression(t.identifier('@html'), [
									t.literal(block.html),
								]),
							),
						]);

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
								t.identifier(elem_ident),
								t.identifier(fragment_ident),
							]),
						);

						scope.definitions.push(template_def, fragment_def);
						scope.expressions.push(append_expr);
					}

					let return_stmt = t.return_statement(t.identifier(elem_ident));
					scope.expressions.push(return_stmt);

					let curr_fragment_ident = '%fragment' + blocks.indexOf(curr_block);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('%component')],
								t.block_statement(merge_scope(scope)),
							),
						),
					]);

					let traverse_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(marker_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(curr_fragment_ident),
								t.array_expression(curr_block.indices.map((i) => t.literal(i))),
							]),
						),
					]);

					let dynamic_expr = t.expression_statement(
						t.call_expression(t.identifier('@dynamic'), [
							t.identifier(marker_ident),
							t.identifier(block_ident),
							t.arrow_function_expression([], _this_expr),
						]),
					);

					curr_scope.traversals.push(traverse_def);
					curr_scope.blocks.push(block_decl);
					curr_scope.expressions.push(dynamic_expr);
				}
				else if (is_inline) {
					id_c++;
					child_to_ident.set(node, elem_ident);

					let marker_ident = '%marker' + (id_m++);
					let fragment_ident = '%fragment' + blocks.indexOf(curr_block);

					let is_self = elem_name === 'v:self';

					let elem_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(elem_ident),
							t.new_expression(
								is_self
									? t.member_expression_from(['$$host', 'constructor'])
									: t.identifier(elem_name),
							),
						),
					]);

					let traverse_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(marker_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(fragment_ident),
								t.array_expression(curr_block.indices.map((i) => t.literal(i))),
							]),
						),
					]);

					let replace_expr = t.expression_statement(
						t.call_expression(t.identifier('@replace'), [
							t.identifier(marker_ident),
							t.identifier(elem_ident),
							t.literal(true),
						]),
					);

					curr_scope.traversals.push(elem_decl, traverse_def);
					curr_scope.expressions.push(replace_expr);
				}

				curr_block.indices.pop();

				if (elem_name === 'v:component' || elem_name === 'v:element') {
					// do nothing
				}
				else if (is_inline) {
					curr_block.html += `</x>`;
				}
				else if (!is_selfclosing) {
					curr_block.html += `</${elem_name}>`;
				}

				return;
			}

			// handle fragment node
			if (node.type === 'Fragment') {
				let curr_block_idx = blocks.indexOf(curr_block);

				let template_ident = '%template' + curr_block_idx;
				let fragment_ident = '%fragment' + curr_block_idx;

				// write marker if not root fragment, but only do so if the end of the
				// fragment is not a static element or text.
				let is_static_end = false;

				// if our parent is an svg, then we need to wrap our template, so that
				// they're parsed appropriately as svg.
				let wrapper = get_current(wrap_stack);

				if (wrapper) {
					curr_block.html = `<${wrapper}>` + curr_block.html + `</${wrapper}>`;
				}

				if (parent) {
					let child = node.children[node.children.length - 1];

					if (
						child &&
						(child.type === 'Text' || (child.type === 'Element' && child.name !== 'v:element' && child.name !== 'v:component'))
					) {
						is_static_end = true;
					}
					else {
						curr_block.html += '<!>';
					}
				}

				let template_def = t.variable_declaration('let', [
					t.variable_declarator(
						// template def has to be hoisted
						t.identifier('%' + template_ident),
						t.call_expression(t.identifier('@html'), [
							t.literal(curr_block.html),
							wrapper && t.literal(!!wrapper),
						]),
					),
				]);

				let fragment_def = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(fragment_ident),
						t.call_expression(t.identifier('@clone'), [t.identifier(template_ident)]),
					),
				]);

				curr_scope.definitions.push(template_def, fragment_def);

				if (parent) {
					// we return the marker we just created, or child if it's single
					let end_ident;
					let need_traverse = false;

					if (is_static_end) {
						let child = node.children[node.children.length - 1];
						let elem_ident = child_to_ident.get(child);

						if (!elem_ident) {
							elem_ident = '%child' + (id_c++);
							child_to_ident.set(child, elem_ident);

							need_traverse = true;
						}

						end_ident = elem_ident;
					}
					else {
						end_ident = '%marker' + (id_m++);
						need_traverse = true;
					}

					if (need_traverse) {
						let traverse_def = t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(end_ident),
								t.call_expression(t.identifier('@traverse'), [
									t.identifier(fragment_ident),
									t.array_expression([
										t.literal(node.children.length + (is_static_end ? -1 : 0)),
									]),
								]),
							),
						]);

						curr_scope.traversals.push(traverse_def);
					}

					let after_expr = t.expression_statement(
						t.call_expression(t.identifier('@after'), [
							t.identifier('$$root'),
							t.identifier(fragment_ident),
						]),
					);

					let return_stmt = t.return_statement(t.identifier(end_ident));

					curr_scope.expressions.push(after_expr, return_stmt);

					// since we created a new scope, pop it, it's placed here because
					// curr_scope is on program for root fragment
					curr_scope = scope_stack.pop();
				}
				else {
					let append_expr = t.expression_statement(
						t.call_expression(t.identifier('@append'), [
							t.identifier('$$root'),
							t.identifier(fragment_ident),
						]),
					);

					curr_scope.expressions.push(append_expr);
				}

				curr_block = block_stack.pop();

				return;
			}

			// handle conditional statement node
			if (node.type === 'ConditionalStatement') {
				let consequent_block = fragment_to_block.get(node.consequent);
				let alternate_block = fragment_to_block.get(node.alternate);

				if (consequent_block) {
					let block_ident = '%block' + blocks.indexOf(consequent_block);
					let scope = fragment_to_scope.get(node.consequent);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(merge_scope(scope)),
							),
						),
					]);

					curr_scope.blocks.push(block_decl);
				}

				if (alternate_block) {
					let block_ident = '%block' + blocks.indexOf(alternate_block);
					let scope = fragment_to_scope.get(node.alternate);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(block_ident),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(merge_scope(scope)),
							),
						),
					]);

					curr_scope.blocks.push(block_decl);
				}

				// conditional statement can be nested for alternate conditions
				// so we'll transform only the toplevel node
				if (parent.type !== 'ConditionalStatement') {
					let prev_node = parent.children[index - 1];
					let after_node = parent.children[index + 1];

					let marker_ident;
					let index_offset = node_offsets.get(parent) || 0;
					let need_traverse = false;

					if (
						prev_node && (
							(prev_node.type === 'Text' && (!after_node || after_node.type !== 'Text')) ||
							(prev_node.type === 'Element' && prev_node.name !== 'v:element' && prev_node.name !== 'v:component')
						)
					) {
						marker_ident = child_to_ident.get(prev_node);
						node_offsets.set(parent, (--index_offset));

						if (!marker_ident) {
							marker_ident = '%child' + (id_c++);
							child_to_ident.set(prev_node, marker_ident);

							need_traverse = true;
						}
					}
					else {
						curr_block.html += '<!>';
						marker_ident = '%marker' + (id_m++);
						need_traverse = true;
					}

					let fragment_ident = '%fragment' + blocks.indexOf(curr_block);

					let array = [];
					let curr = node;

					while (curr?.type === 'ConditionalStatement') {
						array.push(curr);
						curr = curr.alternate;
					}

					let test = null;

					for (let i = array.length - 1; i >= 0; i--) {
						let next = array[i];

						let consequent_block = fragment_to_block.get(next.consequent);
						let consequent_ident = t.identifier('%block' + blocks.indexOf(consequent_block));

						let alternate_block = fragment_to_block.get(next.alternate);
						let alternate_ident = alternate_block
							? t.identifier('%block' + blocks.indexOf(alternate_block))
							: t.literal(null);

						test = t.conditional_expression(next.test, consequent_ident, test || alternate_ident);
					}

					if (need_traverse) {
						let traverse_def = t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(marker_ident),
								t.call_expression(t.identifier('@traverse'), [
									t.identifier(fragment_ident),
									t.array_expression(
										[...curr_block.indices, index + index_offset].map((i) => t.literal(i))
									),
								]),
							),
						]);

						curr_scope.traversals.push(traverse_def);
					}

					let show_expr = t.expression_statement(
						t.call_expression(t.identifier('@show'), [
							t.identifier(marker_ident),
							t.arrow_function_expression([], test),
						]),
					);

					curr_scope.expressions.push(show_expr);
				}

				return;
			}

			// handle loop statement node
			if (node.type === 'LoopStatement') {
				let prev_node = parent.children[index - 1];
				let after_node = parent.children[index + 1];

				let marker_ident;
				let index_offset = node_offsets.get(parent) || 0;
				let need_traverse = false;

				if (
					prev_node && (
						(prev_node.type === 'Text' && (!after_node || after_node.type !== 'Text')) ||
						(prev_node.type === 'Element' && prev_node.name !== 'v:element' && prev_node.name !== 'v:component')
					)
				) {
					marker_ident = child_to_ident.get(prev_node);
					node_offsets.set(parent, (--index_offset));

					if (!marker_ident) {
						marker_ident = '%child' + (id_c++);
						child_to_ident.set(prev_node, marker_ident);

						need_traverse = true;
					}
				}
				else {
					marker_ident = '%marker' + (id_m++);
					curr_block.html += '<!>';
					need_traverse = true;
				}

				let block = fragment_to_block.get(node.body);
				let scope = fragment_to_scope.get(node.body);

				let local = node.local;
				let local_index = node.index;

				// indicate to script transformer that this is a ref
				local.velvet = { ref: true };

				let block_ident = '%block' + blocks.indexOf(block);
				let curr_fragment_ident = '%fragment' + blocks.indexOf(curr_block);

				if (need_traverse) {
					let traverse_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(marker_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(curr_fragment_ident),
								t.array_expression(
									[...curr_block.indices, index + index_offset].map((i) => t.literal(i))
								),
							]),
						),
					]);

					curr_scope.traversals.push(traverse_def);
				}

				let block_decl = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(block_ident),
						t.arrow_function_expression(
							[t.identifier('$$root'), local, local_index],
							t.block_statement(merge_scope(scope)),
						),
					),
				]);

				let each_expr = t.expression_statement(
					t.call_expression(t.identifier('@each'), [
						t.identifier(marker_ident),
						t.identifier(block_ident),
						t.arrow_function_expression([], node.expression),
					]),
				);

				curr_scope.blocks.push(block_decl);
				curr_scope.expressions.push(each_expr);
				return;
			}

			// handle await statement node
			if (node.type === 'AwaitStatement') {
				let prev_node = parent.children[index - 1];
				let after_node = parent.children[index + 1];

				let marker_ident;
				let index_offset = node_offsets.get(parent) || 0;
				let need_traverse = false;

				if (
					prev_node && (
						(prev_node.type === 'Text' && (!after_node || after_node.type !== 'Text')) ||
						(prev_node.type === 'Element' && prev_node.name !== 'v:element' && prev_node.name !== 'v:component')
					)
				) {
					marker_ident = child_to_ident.get(prev_node);
					node_offsets.set(parent, (--index_offset));

					if (!marker_ident) {
						marker_ident = '%child' + (id_c++);
						child_to_ident.set(prev_node, marker_ident);

						need_traverse = true;
					}
				}
				else {
					marker_ident = '%marker' + (id_m++);
					curr_block.html += '<!>';
					need_traverse = true;
				}

				let pending_ident = t.literal(null);
				let resolved_ident = t.literal(null);
				let rejected_ident = t.literal(null);

				if (node.pending) {
					let fragment = node.pending;
					let block = fragment_to_block.get(fragment);
					let scope = fragment_to_scope.get(fragment);

					let pending_name = '%block' + blocks.indexOf(block);
					pending_ident = t.identifier(pending_name);

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(pending_name),
							t.arrow_function_expression(
								[t.identifier('$$root')],
								t.block_statement(merge_scope(scope)),
							),
						),
					]);

					curr_scope.blocks.push(block_decl);
				}

				if (node.resolved) {
					let local = node.resolved.local;
					let fragment = node.resolved.body;

					let block = fragment_to_block.get(fragment);
					let scope = fragment_to_scope.get(fragment);

					let resolved_name = '%block' + blocks.indexOf(block);
					resolved_ident = t.identifier(resolved_name);

					if (local) {
						local.velvet = { ref: true };
					}

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(resolved_name),
							t.arrow_function_expression(
								[t.identifier('$$root'), local],
								t.block_statement(merge_scope(scope)),
							),
						),
					]);

					curr_scope.blocks.push(block_decl);
				}

				if (node.rejected) {
					let local = node.rejected.local;
					let fragment = node.rejected.body;

					let block = fragment_to_block.get(fragment);
					let scope = fragment_to_scope.get(fragment);

					let rejected_name = '%block' + blocks.indexOf(block);
					rejected_ident = t.identifier(rejected_name);

					if (local) {
						local.velvet = { ref: true };
					}

					let block_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(rejected_name),
							t.arrow_function_expression(
								[t.identifier('$$root'), local],
								t.block_statement(merge_scope(scope)),
							),
						),
					]);

					curr_scope.blocks.push(block_decl);
				}

				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);

				if (need_traverse) {
					let traverse_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(marker_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(fragment_ident),
								t.array_expression(
									[...curr_block.indices, index + index_offset].map((i) => t.literal(i))
								),
							]),
						),
					]);

					curr_scope.traversals.push(traverse_def);
				}

				let promies_expr = t.expression_statement(
					t.call_expression(t.identifier('@promise'), [
						t.identifier(marker_ident),
						pending_ident,
						resolved_ident,
						rejected_ident,
						t.arrow_function_expression([], node.argument),
					]),
				);

				curr_scope.expressions.push(promies_expr);
				return;
			}

			// handle keyed statement node
			if (node.type === 'KeyedStatement') {
				let prev_node = parent.children[index - 1];
				let after_node = parent.children[index + 1];

				let marker_ident;
				let index_offset = node_offsets.get(parent) || 0;
				let need_traverse = false;

				if (
					prev_node && (
						(prev_node.type === 'Text' && (!after_node || after_node.type !== 'Text')) ||
						(prev_node.type === 'Element' && prev_node.name !== 'v:element' && prev_node.name !== 'v:component')
					)
				) {
					marker_ident = child_to_ident.get(prev_node);
					node_offsets.set(parent, (--index_offset));

					if (!marker_ident) {
						marker_ident = '%child' + (id_c++);
						child_to_ident.set(prev_node, marker_ident);

						need_traverse = true;
					}
				}
				else {
					marker_ident = '%marker' + (id_m++);
					curr_block.html += '<!>';
					need_traverse = true;
				}

				let block = fragment_to_block.get(node.body);
				let scope = fragment_to_scope.get(node.body);

				let block_ident = '%block' + blocks.indexOf(block);
				let curr_fragment_ident = '%fragment' + blocks.indexOf(curr_block);

				if (need_traverse) {
					let traverse_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(marker_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(curr_fragment_ident),
								t.array_expression(
									[...curr_block.indices, index + index_offset].map((i) => t.literal(i))
								),
							]),
						),
					]);

					curr_scope.traversals.push(traverse_def);
				}

				let block_decl = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(block_ident),
						t.arrow_function_expression(
							[t.identifier('$$root')],
							t.block_statement(merge_scope(scope)),
						),
					),
				]);

				let key_expr = t.expression_statement(
					t.call_expression(t.identifier('@keyed'), [
						t.identifier(marker_ident),
						t.identifier(block_ident),
						t.arrow_function_expression([], node.argument),
					]),
				);

				curr_scope.blocks.push(block_decl);
				curr_scope.expressions.push(key_expr);
				return;
			}
		},
	});

	return t.program(merge_scope(program));
}

function create_block () {
	return {
		html: '',
		indices: [],
	};
}

function get_current (arr, cursor = 0) {
	return arr[arr.length - 1 - cursor];
}

function create_scope () {
	return {
		// @html, @clone
		definitions: [],
		// @traverse, component instantiation
		traversals: [],
		// %block0, $block1, ...
		blocks: [],
		// @append, @after, @text, @show, ...
		expressions: [],
	};
}

function merge_scope (scope) {
	return [
		...scope.definitions,
		...scope.traversals,
		...scope.blocks,
		...scope.expressions,
	];
}
