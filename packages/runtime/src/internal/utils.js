import { Object } from './globals.js';

let RE_HYPHENATE = /\B([A-Z])/g;

export let noop = () => {};

export function hyphenate (str) {
	return str.replace(RE_HYPHENATE, '-$1').toLowerCase();
}

export let is = /*#__PURE__*/ Object.is.bind(Object);
export let assign = /*#__PURE__*/ Object.assign.bind(Object);

/**
 * @param {any} x
 * @returns {x is (...args: any[]) => any}
 */
export let is_function = (x) => typeof x === 'function';

export function to_number (value) {
	return value === '' ? null : +value;
}
