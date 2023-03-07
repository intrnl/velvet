import { create_error } from './utils/error.js';
import { walk } from './utils/walker.js';

export function validate_module (program, source) {
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node) {
			if (node.type === 'ExportDefaultDeclaration') {
				throw create_error(
					'export default is reserved for component definition',
					source,
					node.start,
					node.end,
				);
			}
		},
	});
}
