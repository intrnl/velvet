import { Object } from './globals.js';


let RE_CAMELIZE = /-(\w)/g;
let RE_HYPHENATE = /\B([A-Z])/g;


export let noop = () => {};

export function camelize (str) {
	return str.replace(RE_CAMELIZE, (match, char) => char ? char.toUpperCase() : '');
}

export function hyphenate (str) {
	return str.replace(RE_HYPHENATE, '-$1').toLowerCase();
}

export let is = /*@__PURE__*/ Object.is;
export let assign = /*@__PURE__*/ Object.assign;

export let is_function = (x) => typeof x === 'function';

export function to_number (value) {
	return value === '' ? null : +value;
}
