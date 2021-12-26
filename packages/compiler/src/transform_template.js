import { walk } from './utils/walker.js';
import { b, x } from './utils/js_parse.js';
import * as t from './utils/js_types.js';


export function transform_template (template) {
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

				if (is_inline) {
					curr_block.html += `<div>`;
					return;
				}

				curr_block.html += `<${elem_name}`;

				for (let attribute of node.attributes) {
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
				blocks.push(curr_block = create_block());
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
				let value = node.value.replace(/\s+/g, ' ');

				if (parent.type === 'Fragment') {
					let is_first = index === 0;
					let is_last = index === (parent.children.length - 1);

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

						let statement = t.labeled_statement(t.identifier('$'), t.call_expression(
							t.member_expression(t.identifier('console'), t.identifier('log')),
							params
						));

						curr_scope.push(statement);
						return;
					}
					else {
						throw {
							message: `unknown named expression: @${id_name}`,
							start: id.start,
							end: id.end,
						};
					}
				}

				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let marker_ident = '%marker' + (id_m++);
				let indices = t.array_expression([...curr_block.indices, index].map((idx) => t.literal(idx)));

				curr_block.html += `<!>`;

				let statements = b`
					let ${marker_ident} = @traverse(${fragment_ident}, ${indices});
					@text(${marker_ident}, () => ${expression});
				`;

				curr_scope.push(...statements);
				return;
			}

			if (node.type === 'Element') {
				let ident = '%child' + (id_c++);
				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let need_ident = false;

				let elem_name = node.name;
				let is_inline = node.inline;
				let is_selfclosing = node.self_closing;

				let pending = [];

				let is_checkbox = (
					elem_name === 'input' &&
					node.attributes.some((attr) => attr.name === 'type' && attr.value?.decoded === 'checkbox')
				);

				for (let attribute of node.attributes) {
					let attr_name = attribute.name;
					let attr_value = attribute.value;

					let value_expr = attr_value
						? attr_value.type === 'Text'
							? t.literal(attr_value.decoded)
							: attr_value.expression
						: t.literal(true);

					if (attr_name === '#ref') {
						need_ident = true;

						let statements = b`
							$: ${value_expr} = ${ident};
						`;

						pending.push(...statements);
						continue;
					}

					if (attr_name[0] === '.') {
						need_ident = true;

						let name = t.literal(attr_name.slice(1));

						let statements = b`
							$: ${ident}[${name}] = ${value_expr};
						`;

						pending.push(...statements);
						continue;
					}

					let is_toggle = attr_name[0] === '?';

					if (is_toggle || (node.inline && !attr_value)) {
						need_ident = true;

						let name = t.literal(attr_name.slice(is_toggle ? 1 : 0));

						let statements = b`
							$: @toggle(${ident}, ${name}, ${value_expr});
						`;

						pending.push(...statements);
						continue;
					}

					if (attr_name[0] === '@') {
						need_ident = true;

						let name = t.literal(attr_name.slice(1));

						let statements = b`
							$: @on(${ident}, ${name}, ${value_expr});
						`;

						pending.push(...statements);
						continue;
					}

					if (attr_name[0] === ':') {
						need_ident = true;

						let name = attr_name.slice(1);

						let binding = '%bind' + (id_b++);

						let name_lit = t.literal(attr_name.slice(1));
						let event = t.literal(node.component ? `update:${name}` : `input`);
						let event_target = node.component
							? x`event.detail`
							: is_checkbox
								? x`event.target.checked`
								: x`event.target.value`;

						let statements = b`
							let ${binding} = (event) => ${value_expr} = ${event_target};
							$: ${ident}[${name_lit}] = ${value_expr};
							@on(${ident}, ${event}, ${binding});
						`;

						pending.push(...statements);
						continue;
					}

					if (node.inline || attr_value && attr_value.type !== 'Text') {
						let name = t.literal(attr_name);

						let statements = b`
							$: @attr(${ident}, ${name}, ${value_expr});
						`;

						pending.push(...statements);
						continue;
					}
				}

				if (need_ident && !is_inline) {
					let indices = t.array_expression(curr_block.indices.map((index) => t.literal(index)));

					let declarations = b`
						let ${ident} = @traverse(${fragment_ident}, ${indices});
					`;

					pending.unshift(...declarations);
				}
				else if (is_inline) {
					let marker_ident = '%marker' + (id_m++);

					let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
					let indices = t.array_expression(curr_block.indices.map((index) => t.literal(index)));

					let is_self = elem_name === 'v:self';

					let declarations = b`
						let ${ident} = new ${is_self ? '$$host.constructor' : elem_name}();
					`;

					let statements = b`
						let ${marker_ident} = @traverse(${fragment_ident}, ${indices});
						@replace(${marker_ident}, ${ident}, true);
					`;

					pending.unshift(...declarations);
					pending.push(...statements);
				}

				curr_scope.push(...pending);
				curr_block.indices.pop();

				if (is_inline) {
					curr_block.html += `</div>`;
				}
				else if (!is_selfclosing) {
					curr_block.html += `</${elem_name}>`;
				}
			}

			if (node.type === 'Fragment') {
				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let template_ident = '%template' + blocks.indexOf(curr_block);

				let html = t.literal(curr_block.html + (parent ? '<!>' : ''));

				let template_declarations = b`
					let ${'%' + template_ident} = @html(${html});
					let ${fragment_ident} = @clone(${template_ident});
				`;

				curr_scope.unshift(...template_declarations);

				if (parent) {
					let end_ident = '%marker' + (id_m++);
					let end_index = t.array_expression([t.literal(node.children.length)]);

					let statements = b`
						let ${end_ident} = @traverse(${fragment_ident}, ${end_index});
						@after(${fragment_ident}, $$root);
						return ${end_ident};
					`;

					curr_scope.push(...statements);
					curr_scope = scope_stack.pop();
				}
				else {
					let statements = b`
						@append(${fragment_ident}, $$root);
					`;

					curr_scope.push(...statements);
				}

				curr_block = block_stack.pop();

				return;
			}

			if (node.type === 'ConditionalStatement') {
				let consequent_block = fragment_to_block.get(node.consequent);
				let alternate_block = fragment_to_block.get(node.alternate);

				if (consequent_block) {
					let block_ident = '%block' + blocks.indexOf(consequent_block);
					let scope = fragment_to_scope.get(node.consequent);
					let statement = t.block_statement(scope);

					let declarations = b`
						let ${block_ident} = ($$root) => ${statement};
					`;

					program.push(...declarations);
				}

				if (alternate_block) {
					let block_ident = '%block' + blocks.indexOf(alternate_block);
					let scope = fragment_to_scope.get(node.alternate);
					let statement = t.block_statement(scope);

					let declarations = b`
						let ${block_ident} = ($$root) => ${statement};
					`;

					program.push(...declarations);
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
						let consequent_ident = '%block' + blocks.indexOf(consequent_block);

						let alternate_block = fragment_to_block.get(next.alternate);
						let alternate_ident = alternate_block
							? '%block' + blocks.indexOf(alternate_block)
							: t.literal(null);

						return x`${next.test} ? ${consequent_ident} : ${prev || alternate_ident}`;
					}, null);

					let statements = b`
						let ${marker_ident} = @traverse(${fragment_ident}, ${indices});
						@show(${marker_ident}, () => ${test});
					`;

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
				let expression = x`() => ${node.expression}`;

				let block_ident = t.identifier('%block' + blocks.indexOf(block));
				let statement = t.block_statement(scope);

				local.velvet = { ref: true };

				let declaration = t.variable_declaration('let', [
					t.variable_declarator(block_ident, t.arrow_function_expression([
						t.identifier('$$root'),
						local,
						local_index,
					], statement)),
				]);

				program.push(declaration);

				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let marker_ident = '%marker' + (id_m++);

				let indices = t.array_expression([...curr_block.indices, index].map((idx) => t.literal(idx)));

				let statements = b`
					let ${marker_ident} = @traverse(${fragment_ident}, ${indices});
					@each(${marker_ident}, ${block_ident}, ${expression});
				`;

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
						t.variable_declarator(pending_ident, t.arrow_function_expression([
							t.identifier('$$root'),
						], statement)),
					]);

					program.push(decl);
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
						t.variable_declarator(resolved_ident, t.arrow_function_expression([
							t.identifier('$$root'),
							local,
						], statement)),
					]);

					program.push(decl);
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
						t.variable_declarator(rejected_ident, t.arrow_function_expression([
							t.identifier('$$root'),
							local,
						], statement)),
					]);

					program.push(decl);
				}

				let argument = node.argument;
				let fragment_ident = '%fragment' + blocks.indexOf(curr_block);
				let marker_ident = '%marker' + (id_m++);
				let indices = t.array_expression([...curr_block.indices, index].map((idx) => t.literal(idx)));

				let statements = b`
					let ${marker_ident} = @traverse(${fragment_ident}, ${indices});
					@promise(${marker_ident}, ${pending_ident}, ${resolved_ident}, ${rejected_ident}, ${argument});
				`;

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
