import { print as generate } from '@intrnl/js-printer';
import * as acorn from 'acorn';

import { walk } from './walker.js';

function get_comment_handlers (comments, raw) {
	return {
		// pass to acorn options
		/**
		 * @param {boolean} block
		 * @param {string} value
		 * @param {number} start
		 * @param {number} end
		 */
		handle (block, value, start, end) {
			if (block && /\n/.test(value)) {
				let a = start;
				while (a > 0 && raw[a - 1] !== '\n') {
					a -= 1;
				}

				let b = a;
				while (/[ \t]/.test(raw[b])) {
					b += 1;
				}

				const indentation = raw.slice(a, b);
				value = value.replace(new RegExp(`^${indentation}`, 'gm'), '');
			}

			comments.push({ type: block ? 'Block' : 'Line', value, start, end });
		},

		// pass to estree-walker options
		/** @param {NodeWithLocation} node */
		enter (node) {
			let comment;

			while (comments[0] && comments[0].start < node.start) {
				comment = comments.shift();

				const next = comments[0] || node;
				comment.has_trailing_newline = comment.type === 'Line' ||
					/\n/.test(raw.slice(comment.end, next.start));

				(node.leadingComments || (node.leadingComments = [])).push(comment);
			}
		},

		/** @param {NodeWithLocation} node */
		leave (node) {
			if (comments[0]) {
				const slice = raw.slice(node.end, comments[0].start);

				if (/^[,) \t]*$/.test(slice)) {
					node.trailingComments = [comments.shift()];
				}
			}
		},
	};
}

/**
 * @param {string} source
 * @returns {import('estree').Program}
 */
export function parse (source, options) {
	/** @type {import('estree').Comment[]} */
	let comments = [];
	let comment_handler = get_comment_handlers(comments, source);

	let program = acorn.parse(
		source,
		Object.assign({
			onComment: comment_handler.handle,
			ecmaVersion: 12,
			sourceType: 'module',
		}, options),
	);

	walk(program, comment_handler);
	fix_positions(program, options?.start);
	return program;
}

export function parse_expression (source, position = 0, options) {
	/** @type {import('estree').Comment[]} */
	let comments = [];
	let comment_handler = get_comment_handlers(comments, source);

	let node = acorn.parseExpressionAt(
		source,
		position,
		Object.assign({
			onComment: comment_handler.handle,
			ecmaVersion: 12,
			sourceType: 'module',
		}, options),
	);

	walk(node, comment_handler);
	return node;
}

/**
 * @param {import('estree').Node} ast
 * @param {*} map
 * @returns {string}
 */
export function print (ast, map) {
	const result = generate(ast, {});

	return result.code;
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
