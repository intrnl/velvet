import { entities } from './entities.js';


const windows_1252 = [
	129, 141, 143, 144, 157, 338, 339, 352, 353, 376, 381, 382, 402, 710, 732,
	8211, 8212, 8216, 8217, 8218, 8220, 8221, 8222, 8224, 8225, 8226, 8230, 8240,
	8249, 8250, 8364, 8482,
];

const entity_pattern = new RegExp(`&(#?(?:x[\\w\\d]+|\\d+|${Object.keys(entities).join('|')}))(?:;|\\b)`, 'g');

export function decode_character_references (html) {
	return html.replace(entity_pattern, (match, entity) => {
		let code;

		if (entity[0] !== '#') {
			code = entities[entity];
		} else if (entity[1] === 'x') {
			code = parseInt(entity.substring(2), 16);
		} else {
			code = parseInt(entity.substring(1), 10);
		}

		if (!code) {
			return match;
		}

		return String.fromCodePoint(validate_code(code));
	});
}


const NUL = 0;

function validate_code (code) {
	// line feed becomes generic whitespace
	if (code === 10) {
		return 32;
	}

	// ASCII range
	if (code < 128) {
		return code;
	}

	// code points 128-159 are dealt with leniently by browsers, but they're incorrect
	if (code <= 159) {
		return windows_1252[code - 128];
	}

	// basic multilingual plane
	if (code < 55296) {
		return code;
	}

	// UTF-16 surrogate halves
	if (code <= 57343) {
		return NUL;
	}

	// rest of the basic multilingual plane
	if (code <= 65535) {
		return code;
	}

	// supplementary multilingual plane 0x10000 - 0x1ffff
	if (code >= 65536 && code <= 131071) {
		return code;
	}

	// supplementary ideographic plane 0x20000 - 0x2ffff
	if (code >= 131072 && code <= 196607) {
		return code;
	}

	return NUL;
}


const disallowed_contents = new Map([
	['li', new Set(['li'])],
	['dt', new Set(['dt', 'dd'])],
	['dd', new Set(['dt', 'dd'])],
	['p', new Set(['address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'])],
	['rt', new Set(['rt', 'rp'])],
	['rp', new Set(['rt', 'rp'])],
	['optgroup', new Set(['optgroup'])],
	['option', new Set(['option', 'optgroup'])],
	['thead', new Set(['tbody', 'tfoot'])],
	['tbody', new Set(['tbody', 'tfoot'])],
	['tfoot', new Set(['tbody'])],
	['tr', new Set(['tr', 'tbody'])],
	['td', new Set(['td', 'th', 'tr'])],
	['th', new Set(['td', 'th', 'tr'])]
]);

export function closing_tag_omitted (current, next) {
	if (disallowed_contents.has(current)) {
		if (!next || disallowed_contents.get(current).has(next)) {
			return true;
		}
	}

	return false;
}
