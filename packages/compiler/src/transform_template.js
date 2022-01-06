import { walk } from './utils/walker.js';
import * as t from './utils/js_types.js';
import { create_error } from './utils/error.js';


export function transform_template (template, source) {
	let blocks = [];

	let block_stack = [];
	let curr_block;

	let program = create_scope();
	let scope_stack = [];
	let curr_scope = program;

	let fragment_to_block = new Map();
	let fragment_to_scope = new Map();

	// increment to create unique identifier names
	let id_c = 0;
	let id_m = 0;

	walk(template, {
		enter (node, parent, key, index) {
			// handle element node
			if (node.type === 'Element') {
				curr_block.indices.push(index);

				let elem_name = node.name;
				let is_inline = node.inline;
				let is_selfclosing = node.self_closing;

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
					curr_block.html += '<div>';
					return;
				}

				curr_block.html += `<${elem_name}`;

				for (let attr of node.attributes) {
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

					let is_expr = attr_value && attr_value.type !== 'Text';

					if (is_prop || is_toggle || is_listen || is_bind || is_expr) {
						continue;
					}

					curr_block.html += ` ${attr_name}`;

					let value = attr_value && attr_value.value;

					if (value) {
						// make sure that double quotes are escaped
						value = value.replace(/"/g, '&quot;');
						curr_block.html += `="${value}"`;
					}
				}

				if (is_selfclosing && !is_inline) {
					curr_block.html += ` />`;
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
		leave (node, parent, key, index) {
			// handle comment node, remove them to properly trim whitespace from text nodes
			if (node.type === 'Comment') {
				return walk.remove;
			}

			// handle text node
			if (node.type === 'Text' && parent.type !== 'Attribute') {
				// trim consecutive whitespaces
				let value = node.value.replace(/\s+/g, ' ');

				// trim leading and trailing if parent is fragment, remove if empty
				if (parent.type === 'Fragment') {
					let is_first = index === 0;
					let is_last = index === parent.children.length - 1;

					if (is_first) {
						value = value.replace(/^\s+/, '');
					}
					if (is_last) {
						value = value.replace(/\s+$/, '');
					}

					if (!value) {
						return walk.remove;
					}
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
					let id_name = id.name;

					if (id_name === 'log') {
						let params;

						if (expr.type === 'SequenceExpression') {
							params = expr.expressions;
						}
						else {
							params = [expr];
						}

						let expression = t.labeled_statement(
							t.identifier('$'),
							t.call_expression(
								t.member_expression_from('console', 'log'),
								params,
							),
						);

						curr_scope.expressions.push(expression);
						return;
					}

					throw create_error(
						`unknown named expression: @${id_name}`,
						source,
						id.start,
						id.end
					);
				}

				// text expression
				let fragment_ident ='%fragment' + blocks.indexOf(curr_block);
				let marker_ident ='%marker' + (id_m++);

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

			// handle element node
			if (node.type === 'Element') {
				let elem_name = node.name;
				let is_inline = node.inline;
				let is_selfclosing = node.self_closing;
				let is_component = node.component;

				// we only increment child counter if we've indeed used it.
				let need_ident = false;
				let elem_ident = '%child' + (id_c);
				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);

				// holds expression from #this attribute to instantiate v:component
				let _this_expr;

				// checks for properties and bindings
				let is_checkbox = (
					!is_component && elem_name === 'input' &&
					node.attributes.some((attr) => attr.name === 'type' && attr.value?.decoded === 'checkbox')
				);

				let is_select = (
					!is_component && elem_name === 'select'
				);

				// loop through attributes
				for (let attr of node.attributes) {
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
						if (!attr_value || attr_value.type === 'Text') {
							throw create_error(
								`expected #ref to have an expression`,
								source,
								attr.start,
								attr.end,
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

						let elements;

						if (value_expr.type === 'ArrayExpression') {
							elements = value_expr.elements;
						}
						else {
							elements = [value_expr];
						}

						for (let node of elements) {
							let use_expr = t.expression_statement(
								t.call_expression(t.identifier('@cleanup'), [
									t.call_expression(node, [t.identifier(elem_ident)]),
								]),
							);

							curr_scope.expressions.push(use_expr);
						}

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
						if (is_checkbox && prop_name === 'group') {
							let prop_expr = t.labeled_statement(
								t.identifier('$'),
								t.expression_statement(
									t.assignment_expression(
										t.member_expression_from(elem_ident, 'checked'),
										t.call_expression(
											t.member_expression(value_expr, t.identifier('includes')),
											[t.member_expression_from(elem_ident, 'value')],
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
							let event_name = is_component
								? `update:${prop_name}`
								: `input`;

							let event_fn;

							// handle checkbox group binding
							if (is_checkbox && prop_name === 'group') {
								event_fn = t.arrow_function_expression([], t.assignment_expression(
									t.clone(value_expr),
									t.call_expression(t.identifier('@get_checked_values'), [
										t.clone(value_expr),
										t.member_expression_from(elem_ident, 'value'),
										t.member_expression_from(elem_ident, 'checked'),
									]),
								));
							}
							// handle select value binding
							else if (is_select && prop_name === 'value') {
								event_fn = t.arrow_function_expression([], t.assignment_expression(
									t.clone(value_expr),
									t.call_expression(t.identifier('@get_select_values'), [
										t.identifier(elem_ident),
									]),
								));
							}
							// handle everything else
							else {
								let event_target = is_component
									? t.member_expression_from('%event', 'detail')
									: is_checkbox
										? t.member_expression_from(elem_ident, 'checked')
										: t.member_expression_from(elem_ident, 'value');

								event_fn = t.arrow_function_expression(
									is_component ? [t.identifier('%event')] : [],
									t.assignment_expression(t.clone(value_expr), event_target),
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

					if (is_inline || (attr_value && attr_value.type !== 'Text')) {
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
								: t.call_expression(
										t.member_expression_from('document', 'createElement'),
										[t.identifier('%component')],
									)
						),
					]);


					scope.traversals.push(instantiate_def);

					let block_ident = '%block' + blocks.indexOf(block);
					let template_ident = '%template' + blocks.indexOf(block);
					let fragment_ident = '%fragment' + blocks.indexOf(block);
					let marker_ident = '%marker' + (id_m++);

					// let has_length = scope_has_length(scope);
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

					let marker_ident = '%marker' + (id_m++);

					let fragment_ident = '%fragment' + blocks.indexOf(curr_block);

					let is_self = elem_name === 'v:self';

					let elem_decl = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(elem_ident),
							t.new_expression(
								is_self
									? t.member_expression_from('$$host', 'constructor')
									: t.identifier(elem_name)
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

				if (elem_name === 'v:component') {
					// do nothing
				}
				else if (is_inline) {
					curr_block.html += `</div>`;
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

				// write marker if not root fragment
				if (parent) {
					curr_block.html += '<!>';
				}

				let template_def = t.variable_declaration('let', [
					t.variable_declarator(
						// template def has to be hoisted
						t.identifier('%' + template_ident),
						t.call_expression(t.identifier('@html'), [t.literal(curr_block.html)]),
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
					// we return the marker we just created
					let end_ident = '%marker' + (id_m++);

					let traverse_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(end_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(fragment_ident),
								t.array_expression([t.literal(node.children.length)]),
							]),
						),
					]);

					let after_expr = t.expression_statement(
						t.call_expression(t.identifier('@after'), [
							t.identifier('$$root'),
							t.identifier(fragment_ident),
						]),
					);

					let return_stmt = t.return_statement(t.identifier(end_ident));

					curr_scope.traversals.push(traverse_def);
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
					curr_block.html += '<!>';

					let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
					let marker_ident = '%marker' + (id_m++);

					let array = [];
					let curr = node;

					while (curr?.type === 'ConditionalStatement') {
						array.push(curr);
						curr = curr.alternate;
					}

					let test = array.reduceRight((prev, next) => {
						let consequent_block = fragment_to_block.get(next.consequent);
						let consequent_ident = t.identifier('%block' + blocks.indexOf(consequent_block));

						let alternate_block = fragment_to_block.get(next.alternate);
						let alternate_ident = alternate_block
							? t.identifier('%block' + blocks.indexOf(alternate_block))
							: t.literal(null);

						return t.conditional_expression(next.test, consequent_ident, prev || alternate_ident);
					}, null);

					let traverse_def = t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(marker_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(fragment_ident),
								t.array_expression([...curr_block.indices, index].map(i => t.literal(i))),
							]),
						),
					]);

					let show_expr = t.expression_statement(
						t.call_expression(t.identifier('@show'), [
							t.identifier(marker_ident),
							t.arrow_function_expression([], test),
						]),
					);

					curr_scope.traversals.push(traverse_def);
					curr_scope.expressions.push(show_expr);
				}

				return;
			}

			// handle loop statement node
			if (node.type === 'LoopStatement') {
				curr_block.html += '<!>';

				let block = fragment_to_block.get(node.body);
				let scope = fragment_to_scope.get(node.body);

				let local = node.local;
				let local_index = node.index;

				// indicate to script transformer that this is a ref
				local.velvet = { ref: true };

				let block_ident = '%block' + blocks.indexOf(block);
				let curr_fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let marker_ident = '%marker' + (id_m++);

				let traverse_def = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(marker_ident),
						t.call_expression(t.identifier('@traverse'), [
							t.identifier(curr_fragment_ident),
							t.array_expression([...curr_block.indices, index].map(i => t.literal(i))),
						]),
					),
				]);

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

				curr_scope.traversals.push(traverse_def);
				curr_scope.blocks.push(block_decl);
				curr_scope.expressions.push(each_expr);
				return;
			}

			// handle await statement node
			if (node.type === 'AwaitStatement') {
				curr_block.html += '<!>';

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
								t.block_statement(merge_scope(scope))
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
								t.block_statement(merge_scope(scope))
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
								t.block_statement(merge_scope(scope))
							),
						),
					]);

					curr_scope.blocks.push(block_decl);
				}

				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let marker_ident = '%marker' + (id_m++);

				let traverse_def = t.variable_declaration('let', [
					t.variable_declarator(
						t.identifier(marker_ident),
						t.call_expression(t.identifier('@traverse'), [
							t.identifier(fragment_ident),
							t.array_expression([...curr_block.indices, index].map(i => t.literal(i))),
						]),
					),
				]);

				let promies_expr = t.expression_statement(
					t.call_expression(t.identifier('@promise'), [
						t.identifier(marker_ident),
						pending_ident,
						resolved_ident,
						rejected_ident,
						t.arrow_function_expression([], node.argument),
					]),
				);

				curr_scope.traversals.push(traverse_def);
				curr_scope.expressions.push(promies_expr);
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

function scope_has_length (scope) {
	return !!(
		scope.definitions.length ||
		scope.traversals.length ||
		scope.blocks.length ||
		scope.expressions.length
	);
}
