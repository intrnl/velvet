export let VERSION = process.env.COMPILER_VERSION;

export * from './compile.js';
export * from './parse_template.js';
export * from './transform_script.js';
export * from './transform_template.js';
export * from './validate_module.js';
export * as walker from './utils/walker.js';

export { CompilerError, create_error } from './utils/error.js';
