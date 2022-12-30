import { entities } from './entities.js';


let windows_1252 = [
	129, 141, 143, 144, 157, 338, 339, 352, 353, 376, 381, 382, 402, 710, 732,
	8211, 8212, 8216, 8217, 8218, 8220, 8221, 8222, 8224, 8225, 8226, 8230, 8240,
	8249, 8250, 8364, 8482,
];

let entity_pattern = new RegExp(`&(#?(?:x[\\w\\d]+|\\d+|${Object.keys(entities).join('|')}))(?:;|\\b)`, 'g');

export function decode_character_references (html) {
	return html.replace(entity_pattern, (match, entity) => {
		let code;

		if (entity[0] !== '#') {
			code = entities[entity];
		}
		else if (entity[1] === 'x') {
			code = parseInt(entity.substring(2), 16);
		}
		else {
			code = parseInt(entity.substring(1), 10);
		}

		if (!code) {
			return match;
		}

		return String.fromCodePoint(validate_code(code));
	});
}

let NUL = 0;

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

let void_elements = new Set([
	'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
	'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export function is_void (name) {
	return void_elements.has(name);
}
