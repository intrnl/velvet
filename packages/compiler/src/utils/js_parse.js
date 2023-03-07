import * as acorn from 'acorn';
import { generate } from 'astring';

import { walk } from './walker.js';

/**
 * @param {string} source
 * @returns {import('estree').Program}
 */
export function parse (source, options) {
	/** @type {import('estree').Comment[]} */
	let comments = [];

	let program = acorn.parse(
		source,
		Object.assign({
			onComment: comments,
			ecmaVersion: 12,
			sourceType: 'module',
		}, options),
	);

	reattach_comments(program, comments, source);
	fix_positions(program, options?.start);
	return program;
}

export function parse_expression (source, position = 0, options) {
	/** @type {import('estree').Comment[]} */
	let comments = [];

	let node = acorn.parseExpressionAt(
		source,
		position,
		Object.assign({
			onComment: comments,
			ecmaVersion: 12,
			sourceType: 'module',
		}, options),
	);

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
			let leading_comments = (node.comments ||= []);

			while ((comment = comments[0]) && comment.start < node.start) {
				leading_comments.push(comments.shift());
			}
		},
		/** @param {import('estree').Node} node */
		leave (node) {
			if (node.type === 'Line' || node.type === 'Block') {
				return;
			}

			let trailing_comments = (node.trailingComments ||= []);

			if (comments[0]) {
				let slice = source.slice(node.end, comments[0].start);

				if (/^[,) \t]*$/.test(slice)) {
					trailing_comments.push(comments.shift());
				}
			}
		},
	});
}

function fix_positions (ast, start = 0) {
	if (start < 1) {
		return;
	}

	walk(ast, {
		enter (node) {
			node.start += start;
			node.end += start;
		},
	});
}
