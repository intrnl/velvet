import * as acorn from 'acorn';
import { walk } from 'estree-walker';
import { generate } from 'astring';

/**
 * @param {string} source
 * @returns {import('estree').Program}
 */
export function parse (source) {
	/** @type {import('estree').Comment[]} */
	let comments = [];

	let program = acorn.parse(source, {
		onComment: comments,
		ecmaVersion: 'latest',
		sourceType: 'module',
	});

	walk(program, {
		/** @param {import('estree').Node} node */
		enter (node) {
			/** @type {import('estree').Comment} */
			let comment;
			let leading_comments = node.leadingComments ||= [];

			while ((comment = comments[0]) && comment.start < node.start) {
				leading_comments.push(comments.shift());
			}
		},
		/** @param {import('estree').Node} node */
		leave (node) {
			let trailing_comments = node.trailingComments ||= [];

			if (comments[0]) {
				let slice = source.slice(node.end, comments[0].start);

				if (/^[,) \t]*$/.test(slice)) {
					trailing_comments.push(comments.shift());
				}
			}
		},
	});

	return program;
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
