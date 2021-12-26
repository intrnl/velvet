import { walk } from './utils/walker.js';


export function validate_module (program) {
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node) {
			if (node.type === 'ExportDefaultDeclaration') {
				throw {
					message: 'export default is reserved for component definition',
					start: node.start,
					end: node.end,
				};
			}
		},
	});
}
