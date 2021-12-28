import { walk } from './utils/walker.js';
import { CompilerError } from './utils/error.js';


export function validate_module (program) {
	walk(program, {
		/**
		 * @param {import('estree').Node} node
		 * @param {import('estree').Node} parent
		 */
		enter (node) {
			if (node.type === 'ExportDefaultDeclaration') {
				throw new CompilerError(
					'export default is reserved for component definition',
					node.start,
					node.end,
				);
			}
		},
	});
}
