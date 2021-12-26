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

export function changed (prev, next) {
	return !Object.is(prev, next);
}
