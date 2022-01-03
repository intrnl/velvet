import { walk } from './utils/walker.js';
import * as t from './utils/js_types.js';
import { create_error } from './utils/error.js';


export function transform_template (template, source) {
	let blocks = [];

	let program = [];

	let block_stack = [];
	let scope_stack = [];
	let curr_block;
	let curr_scope = program;

	let fragment_to_block = new Map();
	let fragment_to_scope = new Map();

	let id_c = 0;
	let id_m = 0;
	let id_b = 0;

	walk(template, {
		enter (node, parent, key, index) {
			if (node.type === 'Element') {
				curr_block.indices.push(index);
				let elem_name = node.name;
				let is_inline = node.inline;
				let is_selfclosing = node.self_closing;

				if (elem_name === 'v:component') {
					curr_block.html += '<!>';

					block_stack.push(curr_block);
					blocks.push((curr_block = create_block()));

					scope_stack.push(curr_scope);
					curr_scope = [];
					return;
				}

				if (is_inline) {
					curr_block.html += `<div>`;
					return;
				}

				curr_block.html += `<${elem_name}`;

				for (let attribute of node.attributes) {
					if (attribute.type === 'AttributeSpread') {
						continue;
					}

					let attr_name = attribute.name;
					let attr_value = attribute.value;

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
						let value = attr_value.value.replaceAll('"', '&quot');
						curr_block.html += `="${value}"`;
					}
				}

				if (!is_inline && is_selfclosing) {
					curr_block.html += ` />`;
				}
				else {
					curr_block.html += `>`;
				}

				return;
			}

			if (node.type === 'Fragment') {
				block_stack.push(curr_block);
				blocks.push((curr_block = create_block()));
				fragment_to_block.set(node, curr_block);

				// we shouldn't push a new scope for root fragment
				if (parent) {
					scope_stack.push(curr_scope);
					curr_scope = [];
					fragment_to_scope.set(node, curr_scope);
				}

				return;
			}
		},
		leave (node, parent, key, index) {
			if (node.type === 'Text' && parent.type !== 'Attribute') {
				if (parent.type === 'Element' && (parent.name === 'script' || parent.name === 'style')) {
					curr_block.html += node.value;
					return;
				}

				let value = node.value.replace(/\s+/g, ' ');

				if (parent.type === 'Fragment') {
					let is_first = index === 0;
					let is_last = index === parent.children.length - 1;

					if (is_first) {
						value = value.replace(/^\s+/g, '');
					}
					if (is_last) {
						value = value.replace(/\s+$/g, '');
					}

					if (!value) {
						return walk.remove;
					}
				}

				curr_block.html += value;
				return;
			}

			if (node.type === 'Expression' && parent.type !== 'Attribute') {
				let expression = node.expression;

				if (node.id) {
					let id = node.id;
					let id_name = id.name;

					if (id_name === 'log') {
						let params;

						if (expression.type === 'SequenceExpression') {
							params = expression.expressions;
						}
						else {
							params = [expression];
						}

						let statement = t.labeled_statement(
							t.identifier('$'),
							t.call_expression(t.member_expression(t.identifier('console'), t.identifier('log')), params),
						);

						curr_scope.push(statement);
						return;
					}
					else {
						throw create_error(
							`unknown named expression: @${id_name}`,
							source,
							id.start,
							id.end,
						);
					}
				}

				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let marker_ident = '%marker' + (id_m++);
				let indices = t.array_expression([...curr_block.indices, index].map((idx) => t.literal(idx)));

				curr_block.html += `<!>`;

				let statements = [
					t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(marker_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(fragment_ident),
								indices,
							]),
						)
					]),
					t.expression_statement(
						t.call_expression(t.identifier('@text'), [
							t.identifier(marker_ident),
							t.arrow_function_expression([], expression),
						]),
					),
				];

				curr_scope.push(...statements);
				return;
			}

			if (node.type === 'Element') {
				let ident = t.identifier('%child' + (id_c++));
				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let need_ident = false;

				let elem_name = node.name;
				let is_inline = node.inline;
				let is_selfclosing = node.self_closing;

				let pending = [];

				let is_checkbox =
					elem_name === 'input' &&
					node.attributes.some((attr) => attr.name === 'type' && attr.value?.decoded === 'checkbox');

				let _this_expr;

				for (let attribute of node.attributes) {
					// @todo: attributes that are defined after the spread needs to know
					// the presence of spread
					if (attribute.type === 'AttributeSpread') {
						need_ident = true;

						let expression = attribute.expression;

						let is_static = expression.comments?.length &&
							expression.comments.some((comment) => comment.value.trim() === '@static');

						let statement = t.expression_statement(
							t.call_expression(t.identifier('@assign'), [
								ident,
								expression,
							])
						);

						if (!is_static) {
							statement = t.labeled_statement(t.identifier('$'), statement);
						}

						pending.push(statement);
						continue;
					}

					let attr_name = attribute.name;
					let attr_value = attribute.value;

					let value_expr = attr_value
						? attr_value.type === 'Text'
							? t.literal(attr_value.decoded)
							: attr_value.expression
						: t.literal(true);

					let is_static = value_expr.comments?.length &&
						value_expr.comments.some((comment) => comment.value.trim() === '@static');

					if (attr_name === '#this') {
						if (!attr_value || attr_value.type === 'Text') {
							throw create_error(
								'expected an expression for #this',
								source,
								attribute.start,
								attribute.end,
							);
						}

						if (elem_name !== 'v:component') {
							throw create_error(
								'expected #this usage in v:component',
								source,
								attribute.start,
								attribute.end,
							);
						}

						_this_expr = value_expr;
						continue;
					}

					if (attr_name === '#ref') {
						if (!attr_value || attr_value.type === 'Text') {
							throw create_error(
								'expected an expression for #this',
								source,
								attribute.start,
								attribute.end,
							);
						}

						need_ident = true;

						let statement = t.expression_statement(
							t.assignment_expression(value_expr, ident, '=')
						);

						pending.push(statement);
						continue;
					}

					if (attr_name === '#use') {
						if (!attr_value || attr_value.type === 'Text') {
							throw create_error(
								'expected an expression for #use',
								source,
								attribute.start,
								attribute.end,
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
							let statement = t.expression_statement(
								t.call_expression(t.identifier('@cleanup'), [
									t.call_expression(node, [ident]),
								])
							);

							pending.push(statement);
						}

						break;
					}

					if (attr_name[0] === '.') {
						need_ident = true;

						let name = t.literal(attr_name.slice(1));

						let statement = t.expression_statement(
							t.assignment_expression(
								t.member_expression(ident, name, true),
								value_expr,
								'='
							)
						);

						if (!is_static) {
							statement = t.labeled_statement(t.identifier('$'), statement);
						}

						pending.push(statement);
						continue;
					}

					let is_toggle = attr_name[0] === '?';

					if (is_toggle || (node.inline && !attr_value)) {
						need_ident = true;

						let name = t.literal(attr_name.slice(is_toggle ? 1 : 0));

						let statement = t.expression_statement(
							t.call_expression(t.identifier('@toggle'), [
								ident,
								name,
								value_expr,
							])
						);

						if (!is_static) {
							statement = t.labeled_statement(t.identifier('$'), statement);
						}

						pending.push(statement);
						continue;
					}

					if (attr_name[0] === '@') {
						need_ident = true;

						let name = t.literal(attr_name.slice(1));

						let statement = t.expression_statement(
							t.call_expression(t.identifier('@on'), [
								ident,
								name,
								value_expr,
							])
						);

						pending.push(statement);
						continue;
					}

					if (attr_name[0] === ':') {
						if (!attr_value || attr_value.type === 'Text') {
							throw create_error(
								'expected an expression for #this',
								source,
								attribute.start,
								attribute.end,
							);
						}

						need_ident = true;

						let name = attr_name.slice(1);

						let binding = '%bind' + (id_b++);

						let name_lit = t.literal(attr_name.slice(1));
						let event = t.literal(node.component ? `update:${name}` : `input`);
						let event_target = node.component
							? t.member_expression_from('event', 'detail')
							: is_checkbox
								? t.member_expression_from('event', 'target', 'checked')
								: t.member_expression_from('event', 'target', 'value');

						let statements = [
							t.variable_declaration('let', [
								t.variable_declarator(
									t.identifier(binding),
									t.arrow_function_expression(
										[t.identifier('event')],
										t.assignment_expression(value_expr, event_target),
									),
								),
							]),
							t.labeled_statement(
								t.identifier('$'),
								t.expression_statement(
									t.assignment_expression(
										t.member_expression(ident, name_lit, true),
										value_expr,
									),
								),
							),
							t.expression_statement(
								t.call_expression(t.identifier('@on'), [
									ident,
									event,
									t.identifier(binding),
								]),
							),
						];

						pending.push(...statements);
						continue;
					}

					if (node.inline || (attr_value && attr_value.type !== 'Text')) {
						need_ident = true;

						let name = t.literal(attr_name);

						let statement = t.expression_statement(
							t.call_expression(t.identifier('@attr'), [
								ident,
								name,
								value_expr
							])
						);

						if (!is_static) {
							statement = t.labeled_statement(t.identifier('$'), statement);
						}

						pending.push(statement);
						continue;
					}
				}

				if (need_ident && !is_inline) {
					let indices = t.array_expression(curr_block.indices.map((index) => t.literal(index)));

					let declaration = t.variable_declaration('let', [
						t.variable_declarator(
							ident,
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(fragment_ident),
								indices,
							])
						),
					]);

					pending.unshift(declaration);
				}
				else if (elem_name === 'v:component') {
					let block = curr_block;
					let scope = curr_scope;

					curr_block = block_stack.pop();
					curr_scope = scope_stack.pop();

					if (!_this_expr) {
						throw create_error(
							'expected #this expression for v:component',
							source,
							node.start,
							node.end,
						);
					}

					let header = [
						t.variable_declaration('let', [
							t.variable_declarator(
								ident,
								t.new_expression(t.identifier('%component')),
							),
						]),
					];

					let footer = [
						t.return_statement(ident),
					];

					pending.unshift(...header);
					pending.push(...footer);

					let block_ident = '%block' + blocks.indexOf(block);
					let template_ident = '%template' + blocks.indexOf(block);
					let fragment_ident = '%fragment' + blocks.indexOf(block);
					let marker_ident = '%marker' + (id_m++);

					if (scope.length) {
						let template_declarations = [
							t.variable_declaration('let', [
								t.variable_declarator(
									t.identifier('%' + template_ident),
									t.call_expression(t.identifier('@html'), [
										t.literal(block.html),
									]),
								),
							]),
							t.variable_declaration('let', [
								t.variable_declarator(
									t.identifier(fragment_ident),
									t.call_expression(t.identifier('@clone'), [
										t.identifier(template_ident),
									]),
								),
							]),
						];

						scope.unshift(...template_declarations);
					}

					let curr_fragment_ident = '%fragment' + blocks.indexOf(curr_block);
					let indices = t.array_expression([...curr_block.indices].map((idx) => t.literal(idx)));
					let block_statement = t.block_statement([...scope, ...pending]);
					pending.length = 0;

					let statements = [
						t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(block_ident),
								t.arrow_function_expression(
									[t.identifier('%component')],
									block_statement
								),
							),
						]),
						t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(marker_ident),
								t.call_expression(t.identifier('@traverse'), [
									t.identifier(curr_fragment_ident),
									indices,
								]),
							),
						]),
						t.expression_statement(
							t.call_expression(t.identifier('@dynamic'), [
								t.identifier(marker_ident),
								t.identifier(block_ident),
								t.arrow_function_expression([], _this_expr),
							]),
						),
					];

					pending.push(...statements);
				}
				else if (is_inline) {
					let marker_ident = '%marker' + (id_m++);

					let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
					let indices = t.array_expression(curr_block.indices.map((index) => t.literal(index)));

					let is_self = elem_name === 'v:self';

					let declarations = [
						t.variable_declaration('let', [
							t.variable_declarator(
								ident,
								t.new_expression(
									is_self
										? t.member_expression_from('$$host', 'constructor')
										: t.identifier(elem_name)
								),
							),
						]),
					];

					let statements = [
						t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(marker_ident),
								t.call_expression(t.identifier('@traverse'), [
									t.identifier(fragment_ident),
									indices,
								]),
							),
						]),
						t.expression_statement(
							t.call_expression(t.identifier('@replace'), [
								t.identifier(marker_ident),
								ident,
								t.literal(true),
							]),
						),
					];

					pending.unshift(...declarations);
					pending.push(...statements);
				}

				curr_scope.push(...pending);
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

			if (node.type === 'Fragment') {
				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let template_ident = '%template' + blocks.indexOf(curr_block);

				let html = t.literal(curr_block.html + (parent ? '<!>' : ''));

				let template_declarations = [
					t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier('%' + template_ident),
							t.call_expression(t.identifier('@html'), [html]),
						),
					]),
					t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(fragment_ident),
							t.call_expression(t.identifier('@clone'), [t.identifier(template_ident)]),
						),
					]),
				];

				curr_scope.unshift(...template_declarations);

				if (parent) {
					let end_ident = t.identifier('%marker' + (id_m++));
					let end_index = t.array_expression([t.literal(node.children.length)]);

					let statements = [
						t.variable_declaration('let', [
							t.variable_declarator(
								end_ident,
								t.call_expression(t.identifier('@traverse'), [
									t.identifier(fragment_ident),
									end_index,
								]),
							),
						]),

						t.expression_statement(
							t.call_expression(t.identifier('@after'), [
								t.identifier('$$root'),
								t.identifier(fragment_ident),
							]),
						),

						t.return_statement(end_ident),
					];

					curr_scope.push(...statements);
					curr_scope = scope_stack.pop();
				}
				else {
					let statement = t.expression_statement(
						t.call_expression(t.identifier('@append'), [
							t.identifier('$$root'),
							t.identifier(fragment_ident),
						]),
					);

					curr_scope.push(statement);
				}

				curr_block = block_stack.pop();

				return;
			}

			if (node.type === 'ConditionalStatement') {
				let consequent_block = fragment_to_block.get(node.consequent);
				let alternate_block = fragment_to_block.get(node.alternate);

				if (consequent_block) {
					let block_ident = t.identifier('%block' + blocks.indexOf(consequent_block));
					let scope = fragment_to_scope.get(node.consequent);
					let statement = t.block_statement(scope);

					let declaration = t.variable_declaration('let', [
						t.variable_declarator(
							block_ident,
							t.arrow_function_expression([t.identifier('$$root')], statement),
						),
					]);

					curr_scope.push(declaration);
				}

				if (alternate_block) {
					let block_ident = t.identifier('%block' + blocks.indexOf(alternate_block));
					let scope = fragment_to_scope.get(node.alternate);
					let statement = t.block_statement(scope);

					let declaration = t.variable_declaration('let', [
						t.variable_declarator(
							block_ident,
							t.arrow_function_expression([t.identifier('$$root')], statement),
						),
					]);

					curr_scope.push(declaration);
				}

				if (parent.type !== 'ConditionalStatement') {
					curr_block.html += '<!>';

					let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
					let marker_ident = '%marker' + (id_m++);

					let indices = t.array_expression([...curr_block.indices, index].map((idx) => t.literal(idx)));

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

					let statements = [
						t.variable_declaration('let', [
							t.variable_declarator(
								t.identifier(marker_ident),
								t.call_expression(t.identifier('@traverse'), [
									t.identifier(fragment_ident),
									indices,
								]),
							),
						]),
						t.expression_statement(
							t.call_expression(t.identifier('@show'), [
								t.identifier(marker_ident),
								t.arrow_function_expression([], test),
							]),
						),
					];

					curr_scope.push(...statements);
				}

				return;
			}

			if (node.type === 'LoopStatement') {
				curr_block.html += '<!>';

				let block = fragment_to_block.get(node.body);
				let scope = fragment_to_scope.get(node.body);

				let local = node.local;
				let local_index = node.index;
				let expression = t.arrow_function_expression([], node.expression);

				let block_ident = t.identifier('%block' + blocks.indexOf(block));
				let statement = t.block_statement(scope);

				local.velvet = { ref: true };

				let declaration = t.variable_declaration('let', [
					t.variable_declarator(
						block_ident,
						t.arrow_function_expression([t.identifier('$$root'), local, local_index], statement),
					),
				]);

				curr_scope.push(declaration);

				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let marker_ident = '%marker' + (id_m++);

				let indices = t.array_expression([...curr_block.indices, index].map((idx) => t.literal(idx)));

				let statements = [
					t.variable_declaration('let', [
						t.variable_declarator(
							t.identifier(marker_ident),
							t.call_expression(t.identifier('@traverse'), [
								t.identifier(fragment_ident),
								indices,
							]),
						),
					]),
					t.expression_statement(
						t.call_expression(t.identifier('@each'), [
							t.identifier(marker_ident),
							block_ident,
							expression,
						]),
					),
				];

				curr_scope.push(...statements);
				return;
			}

			if (node.type === 'AwaitStatement') {
				curr_block.html += '<!>';

				let pending_ident = t.literal(null);
				let resolved_ident = t.literal(null);
				let rejected_ident = t.literal(null);

				if (node.pending) {
					let fragment = node.pending;
					let block = fragment_to_block.get(fragment);
					let scope = fragment_to_scope.get(fragment);

					pending_ident = t.identifier('%block' + blocks.indexOf(block));
					let statement = t.block_statement(scope);

					let decl = t.variable_declaration('let', [
						t.variable_declarator(pending_ident, t.arrow_function_expression([t.identifier('$$root')], statement)),
					]);

					curr_scope.push(decl);
				}

				if (node.resolved) {
					let local = node.resolved.local;
					let fragment = node.resolved.body;

					let block = fragment_to_block.get(fragment);
					let scope = fragment_to_scope.get(fragment);

					resolved_ident = t.identifier('%block' + blocks.indexOf(block));
					let statement = t.block_statement(scope);

					if (local) {
						local.velvet = { ref: true };
					}

					let decl = t.variable_declaration('let', [
						t.variable_declarator(
							resolved_ident,
							t.arrow_function_expression([t.identifier('$$root'), local], statement),
						),
					]);

					curr_scope.push(decl);
				}

				if (node.rejected) {
					let local = node.rejected.local;
					let fragment = node.rejected.body;

					let block = fragment_to_block.get(fragment);
					let scope = fragment_to_scope.get(fragment);

					rejected_ident = t.identifier('%block' + blocks.indexOf(block));
					let statement = t.block_statement(scope);

					if (local) {
						local.velvet = { ref: true };
					}

					let decl = t.variable_declaration('let', [
						t.variable_declarator(
							rejected_ident,
							t.arrow_function_expression([t.identifier('$$root'), local], statement)
						),
					]);

					curr_scope.push(decl);
				}

				let argument = t.arrow_function_expression([], node.argument);
				let fragment_ident = t.identifier('%fragment' + blocks.indexOf(curr_block));
				let marker_ident = t.identifier('%marker' + (id_m++));
				let indices = t.array_expression([...curr_block.indices, index].map((idx) => t.literal(idx)));

				let statements = [
					t.variable_declaration('let', [
						t.variable_declarator(
							marker_ident,
							t.call_expression(t.identifier('@traverse'), [
								fragment_ident,
								indices,
							]),
						),
					]),
					t.expression_statement(
						t.call_expression(t.identifier('@promise'), [
							marker_ident,
							pending_ident,
							resolved_ident,
							rejected_ident,
							argument,
						]),
					),
				];

				curr_scope.push(...statements);
				return;
			}
		},
	});

	return t.program(program);
}

function create_block () {
	return {
		html: '',
		indices: [],
	};
}
