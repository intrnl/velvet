import * as acorn from 'acorn';
import { generate } from 'astring';

import { walk } from './walker.js';
import * as t from './js_types.js';

/**
 * @param {string} source
 * @returns {import('estree').Program}
 */
export function parse (source, options) {
	/** @type {import('estree').Comment[]} */
	let comments = [];

	let program = acorn.parse(source, {
		onComment: comments,
		ecmaVersion: 'latest',
		sourceType: 'module',
		...options,
	});

	reattach_comments(program, comments, source);
	return program;
}

export function parse_expression (source, position = 0, options) {
	/** @type {import('estree').Comment[]} */
	let comments = [];

	let node = acorn.parseExpressionAt(source, position, {
		onComment: comments,
		ecmaVersion: 'latest',
		sourceType: 'module',
		...options,
	});

	reattach_comments(node, comments, source);
	return node;
}

/**
 * @param {import('estree').Node} ast
 * @param {*} map
 * @returns {string}
 */
export function print (ast, map) {
	return generate(ast, {
		comments: true,
		sourceMap: map,
	});
}

function reattach_comments (ast, comments, source) {
	walk(ast, {
		/** @param {import('estree').Node} node */
		enter (node) {
			if (node.type === 'Line' || node.type === 'Block') {
				return;
			}

			/** @type {import('estree').Comment} */
			let comment;
			let leading_comments = node.leadingComments ||= [];

			while ((comment = comments[0]) && comment.start < node.start) {
				leading_comments.push(comments.shift());
			}
		},
		/** @param {import('estree').Node} node */
		leave (node) {
			if (node.type === 'Line' || node.type === 'Block') {
				return;
			}

			let trailing_comments = node.trailingComments ||= [];

			if (comments[0]) {
				let slice = source.slice(node.end, comments[0].start);

				if (/^[,) \t]*$/.test(slice)) {
					trailing_comments.push(comments.shift());
				}
			}
		},
	});
}

let unique_id = (Math.round(Math.random() * 1e13)).toString(36);
let unique_regex = new RegExp(`_${unique_id}_(?:(\\d+)|(FOO)|(BAR)|(BAZ))_(\\w+)?`, 'g');

let sigils = {
	'@': 'FOO',
	'%': 'BAR',
	'%%': 'BAZ'
};

function join_placeholders (strings) {
	let result = strings[0];

	for (let index = 1; index < strings.length; index++) {
		result += `_${unique_id}_${index - 1}_${strings[index]}`;
	}

	return result.replace(
		/(@|%|%%)(\w+)/g,
		(_, sigil, id) => `_${unique_id}_${sigils[sigil]}_${id}`,
	);
}

function inject_placeholders (node, values) {
	walk(node, {
		leave (node) {
			delete node.start;
			delete node.end;

			if (node.type === 'Identifier') {
				unique_regex.lastIndex = 0;
				let match = unique_regex.exec(node.name);

				if (match) {
					if (match[1]) {
						let value = values[+match[1]];

						if (typeof value === 'string') {
							value = t.identifier(value);
						}

						return value;
					} else {
						node.name = `${match[2] ? `@` : match[3] ? `%` : `%%`}${match[5]}`;
					}
				}
			}
		},
	});
}

let ast_cache = new WeakMap();

export function x (strings, ...values) {
	let base = ast_cache.get(strings);

	if (!base) {
		let str = join_placeholders(strings);
		let ast = parse_expression(str);

		ast_cache.set(strings, base = ast);
	}

	let expression = structuredClone(base);
	inject_placeholders(expression, values);

	return expression;
}

export function b (strings, ...values) {
	let base = ast_cache.get(strings);

	if (!base) {
		let str = join_placeholders(strings);
		let ast = parse(str, { allowReturnOutsideFunction: true });

		for (let statement of ast.body) {
			statement.path.parent = undefined;
		}

		ast_cache.set(strings, base = ast.body);
	}

	let program = structuredClone(base);
	inject_placeholders(program, values);

	return program;
}
