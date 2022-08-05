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
		transformers = [],
		css,
		path = '@intrnl/velvet/internal',
	} = options;

	let template = parse_template(source);

	// run transformers
	for (let transformer of transformers) {
		transformer(template);
	}

	// collect specialities
	let options_node;
	let module_node;
	let script_node;
	let style_node;
	let style_value = null;

	for (let index = 0; index < template.children.length; index++) {
		/** @type {import('./utils/template_types.js').Node} */
		let node = template.children[index];

		if (node.type !== 'Element') {
			continue;
		}

		let name = node.name;

		if (name === 'script') {
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
				if (module_node) {
					throw create_error(
						'there can only be one root-level <script context="module"> element',
						source,
						node.start,
						node.end,
					);
				}

				module_node = node;
				template.children.splice(index--, 1);
				continue;
			}

			if (script_node) {
				throw create_error(
					'there can only be one root-level <script> element',
					source,
					node.start,
					node.end,
				);
			}

			script_node = node;
			template.children.splice(index--, 1);
			continue;
		}

		if (name === 'style') {
			if (style_node) {
				throw create_error(
					'there can be only one root-level <style> element',
					source,
					node.start,
					node.end,
				);
			}

			style_node = node;
			template.children.splice(index--, 1);
			continue;
		}

		if (name === 'v:options') {
			if (options_node) {
				throw create_error(
					'there can only be one <v:options> element',
					source,
					node.start,
					node.end,
				);
			}

			options_node = node;
			template.children.splice(index--, 1);
			continue;
		}
	}

	// retrieve component options
	if (options_node) {
		for (let attr of options_node.attributes) {
			if (attr.type === 'AttributeSpread') {
				throw create_error(
					`attribute spread not supported on <v:options> element`,
					source,
					attr.start,
					attr.end,
				);
			}

			let attr_name = attr.name;
			let attr_value = attr.value;

			if (attr_name === 'name') {
				if (!attr_value || attr_value.type !== 'Text') {
					throw create_error(
						`<v:options name> must contain a string value`,
						source,
						attr.start,
						attr.end,
					);
				}

				let trimmed = attr_value.decoded.trim();

				if (!trimmed) {
					throw create_error(
						`<v:options name> must not contain an empty string value`,
						source,
						attr.start,
						attr.end,
					);
				}

				if (!(/^[^-\d].*-.*$/).test(trimmed)) {
					throw create_error(
						`invalid custom elements tag provided to <v:options name>`,
						source,
						attr.start,
						attr.end,
					);
				}

				name = attr_value.value;
			}
		}
	}

	// transform specialities
	if (style_node) {
		let text_node = style_node.children[0];
		let value = text_node.value;

		if (css) {
			value = yield* wrap(css)(value);
		}

		if (typeof value === 'string') {
			value = {
				css: value,
				dependencies: [],
			};
		}

		style_value = value;
	}

	let program = transform_template(template, source);

	if (script_node) {
		let text_node = script_node.children[0];
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
	finalize_template(program, name, props_idx, style_value);

	if (module_node) {
		let text_node = module_node.children[0];
		let text_start = text_node.start;
		let prog;

		try {
			prog = parse(text_node.value, {
				start: text_start,
				allowAwaitOutsideFunction: true,
			});
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
