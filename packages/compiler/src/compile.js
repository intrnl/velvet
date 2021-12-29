import gensync from 'gensync';

import { parse_template } from './parse_template.js';
import { transform_template } from './transform_template.js';
import { finalize_program, finalize_template, transform_script } from './transform_script.js';
import { validate_module } from './validate_module.js';

import { parse, print } from './utils/js_parse.js';
import { create_error } from './utils/error.js';


let wrap = (f) => gensync({ sync: f, async: f });

function* _compile (source, options = {}) {
	let {
		prefix = 'x',
		filename,
		name = componentize(filename, prefix),
		css,
		path = '@intrnl/velvet/internal',
	} = options;

	let template = parse_template(source);

	// collect specialities
	let mod;
	let script;
	let style;

	for (let index = 0; index < template.children.length; index++) {
		let node = template.children[index];

		if (node.type !== 'Element') {
			continue;
		}

		if (node.name === 'script') {
			let context_attr = node.attributes.find((attr) => attr.name === 'context');

			if (context_attr) {
				if (context_attr.value?.decoded !== 'module') {
					throw create_error(
						'expected context="module" for module scripts',
						source,
						node.start,
						node.end,
					);
				}
				if (mod) {
					throw create_error(
						'there can only be one root-level <script context="module"> element',
						source,
						node.start,
						node.end,
					);
				}

				mod = node;
				template.children.splice(index--, 1);
				continue;
			}

			if (script) {
				throw create_error(
					'there can only be one root-level <script> element',
					source,
					node.start,
					node.end,
				);
			}

			script = node;
			template.children.splice(index--, 1);
			continue;
		}

		if (node.name === 'style') {
			if (style) {
				throw create_error(
					'there can be only one root-level <style> element',
					source,
					node.start,
					node.end,
				);
			}

			style = node;
			template.children.splice(index--, 1);
			continue;
		}
	}

	// trim whitespaces
	while (true) {
		let node = template.children[0];

		if (!node || node.type !== 'Text') {
			break;
		}

		let prev = node.value;
		let next = prev.replace(/^\s+/, '');

		if (prev === next) {
			break;
		}
		if (!next) {
			template.children.splice(0, 1);
		}

		node.value = next;
	}

	while (true) {
		let idx = template.children.length - 1;
		let node = template.children[idx];

		if (!node || node.type !== 'Text') {
			break;
		}

		let prev = node.value;
		let next = prev.replace(/\s+$/, '');

		if (prev === next) {
			break;
		}
		if (!next) {
			template.children.splice(idx, 1);
		}

		node.value = next;
	}

	// transform specialities
	if (style) {
		let text_node = style.children[0];
		let value = text_node.value;

		if (css) {
			value = yield* wrap(css)(value);
		}

		text_node.value = value;

		template.children.push(style);
	}

	let program = transform_template(template, source);

	if (script) {
		let text_node = script.children[0];
		let text_start = text_node.start;
		let prog;

		try {
			prog = parse(text_node.value, { start: text_start });
		}
		catch (error) {
			let message = error.message.replace(/ +\(\d+:\d+\)$/g, '');
			throw create_error(`Acorn error: ${message}`, source, error.pos + text_start);
		}

		program.body.unshift(...prog.body);
	}

	let { props_idx } = transform_script(program, source);
	finalize_template(program, name, props_idx);

	if (mod) {
		let text_node = mod.children[0];
		let text_start = text_node.start;
		let prog;

		try {
			prog = parse(text_node.value, {
				start: text_start,
				allowAwaitOutsideFunction: true,
			})
		}
		catch (error) {
			let message = error.message.replace(/ +\(\d+:\d+\)$/g, '');
			throw create_error(`Acorn error: ${message}`, source, error.pos + text_start);
		}

		validate_module(prog, source);
		program.body.unshift(...prog.body);
	}

	finalize_program(program, path);

	return print(program);
}

export let {
	async: compile,
	sync: compileSync,
} = gensync(_compile);


export function componentize (filename, prefix = 'x') {
	if (!filename) {
		return null;
	}

	const parts = filename.split(/[/\\]/).map(encodeURI);

	if (parts.length > 1) {
		const index_match = parts[parts.length - 1].match(/^index(\.\w+)/);
		if (index_match) {
			parts.pop();
			parts[parts.length - 1] += index_match[1];
		}
	}

	const base = parts.pop()
		.replace(/%20/g, '-')
		.replace(/%/g, 'u')
		.replace(/^_+|_+$|\.[^.]+$/g, '')
		.replace(/[^a-zA-Z0-9-]+/g, '-')
		.replace(/(?<!^)[A-Z]/g, '-$&')
		.toLowerCase();

	if (!base) {
		throw new Error(`Could not derive component name from file ${filename}`);
	}

	return prefix + '-' + base;
}
