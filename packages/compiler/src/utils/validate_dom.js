// https://github.com/facebook/react/blob/de7d1c90718ea8f4844a2219991f7115ef2bd2c5/packages/react-dom-bindings/src/client/validateDOMNesting.js

import { assert } from './error.js';

// This validation code was written based on the HTML5 parsing spec:
// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
//
// Note: this does not catch all invalid nesting, nor does it try to (as it's
// not clear what practical benefit doing so provides); instead, we warn only
// for cases where the parser will give a parse tree differing from what React
// intended. For example, <b><div></div></b> is invalid but we don't warn
// because it still parses correctly; we do warn for other cases like nested
// <p> tags where the beginning of the second element implicitly closes the
// first, causing a confusing mess.

/**
 * @typedef {object} Info
 * @property {string} tag
 */

/**
 * @typedef {object} AncestorInfo
 * @property {?Info} current
 *
 * @property {?Info} form_tag
 * @property {?Info} a_tag_in_scope
 * @property {?Info} button_tag_in_scope
 * @property {?Info} no_br_tag_in_scope
 * @property {?Info} p_tag_in_button_scope
 *
 * @property {?Info} list_item_tag_autoclosing
 * @property {?Info} dl_item_tag_autoclosing
 *
 * @property {?Info} container_tag_in_scope <head> or <body>
 */

// https://html.spec.whatwg.org/multipage/syntax.html#special
let SPECIAL_TAGS = [
	'address',
	'applet',
	'area',
	'article',
	'aside',
	'base',
	'basefont',
	'bgsound',
	'blockquote',
	'body',
	'br',
	'button',
	'caption',
	'center',
	'col',
	'colgroup',
	'dd',
	'details',
	'dir',
	'div',
	'dl',
	'dt',
	'embed',
	'fieldset',
	'figcaption',
	'figure',
	'footer',
	'form',
	'frame',
	'frameset',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'head',
	'header',
	'hgroup',
	'hr',
	'html',
	'iframe',
	'img',
	'input',
	'isindex',
	'li',
	'link',
	'listing',
	'main',
	'marquee',
	'menu',
	'menuitem',
	'meta',
	'nav',
	'noembed',
	'noframes',
	'noscript',
	'object',
	'ol',
	'p',
	'param',
	'plaintext',
	'pre',
	'script',
	'section',
	'select',
	'source',
	'style',
	'summary',
	'table',
	'tbody',
	'td',
	'template',
	'textarea',
	'tfoot',
	'th',
	'thead',
	'title',
	'tr',
	'track',
	'ul',
	'wbr',
	'xmp',
];

// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
let IN_SCOPE_TAGS = [
	'applet',
	'caption',
	'html',
	'table',
	'td',
	'th',
	'marquee',
	'object',
	'template',

	// https://html.spec.whatwg.org/multipage/syntax.html#html-integration-point
	// TODO: Distinguish by namespace here -- for <title>, including it here
	// errs on the side of fewer warnings
	'foreignObject',
	'desc',
	'title',
];

// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-button-scope
let BUTTON_SCOPE_TAGS = IN_SCOPE_TAGS.concat(['button']);

// https://html.spec.whatwg.org/multipage/syntax.html#generate-implied-end-tags
let IMPLIED_END_TAGS = [
	'dd',
	'dt',
	'li',
	'option',
	'optgroup',
	'p',
	'rp',
	'rt',
];

/** @type {AncestorInfo} */
let EMPTY_ANCESTOR_INFO = {
	current: null,

	form_tag: null,
	a_tag_in_scope: null,
	button_tag_in_scope: null,
	no_br_tag_in_scope: null,
	p_tag_in_button_scope: null,

	list_item_tag_autoclosing: null,
	dl_item_tag_autoclosing: null,

	container_tag_in_scope: null,
};

/**
 * @param {string} tag
 * @param {AncestorInfo} [prev]
 * @returns {AncestorInfo}
 */
export function update_ancestor_info (tag, prev) {
	let ancestor_info = { ...(prev || EMPTY_ANCESTOR_INFO) };
	let info = { tag };

	if (IN_SCOPE_TAGS.indexOf(tag) !== -1) {
		ancestor_info.a_tag_in_scope = null;
		ancestor_info.button_tag_in_scope = null;
		ancestor_info.no_br_tag_in_scope = null;
	}

	if (BUTTON_SCOPE_TAGS.indexOf(tag) !== -1) {
		ancestor_info.p_tag_in_button_scope = null;
	}

	// See rules for 'li', 'dd', 'dt' start tags in
	// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
	if (
		SPECIAL_TAGS.indexOf(tag) !== -1 &&
		tag !== 'address' &&
		tag !== 'div' &&
		tag !== 'p'
	) {
		ancestor_info.list_item_tag_autoclosing = null;
		ancestor_info.dl_item_tag_autoclosing = null;
	}

	ancestor_info.current = info;

	if (tag === 'form') {
		ancestor_info.form_tag = info;
	}

	if (tag === 'a') {
		ancestor_info.a_tag_in_scope = info;
	}

	if (tag === 'button') {
		ancestor_info.button_tag_in_scope = info;
	}

	if (tag === 'nobr') {
		ancestor_info.no_br_tag_in_scope = info;
	}

	if (tag === 'p') {
		ancestor_info.p_tag_in_button_scope = info;
	}

	if (tag === 'li') {
		ancestor_info.list_item_tag_autoclosing = info;
	}

	if (tag === 'dd' || tag === 'dt') {
		ancestor_info.dl_item_tag_autoclosing = info;
	}

	if (tag === '#document' || tag === 'html') {
		ancestor_info.container_tag_in_scope = null;
	}
	else if (!ancestor_info.container_tag_in_scope) {
		ancestor_info.container_tag_in_scope = info;
	}

	return ancestor_info;
}

/**
 * @param {string} tag
 * @param {string} parent_tag
 * @returns {boolean}
 */
function is_tag_valid_with_parent (tag, parent_tag) {
	// First, let's check if we're in an unusual parsing mode...
	switch (parent_tag) {
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
		case 'select':
			return tag === 'option' || tag === 'optgroup' || tag === '#text';
		case 'optgroup':
			return tag === 'option' || tag === '#text';
		// Strictly speaking, seeing an <option> doesn't mean we're in a <select>
		// but
		case 'option':
			return tag === '#text';
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
		// No special behavior since these rules fall back to "in body" mode for
		// all except special table nodes which cause bad parsing behavior anyway.

		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intr
		case 'tr':
			return (
				tag === 'th' ||
				tag === 'td' ||
				tag === 'style' ||
				tag === 'script' ||
				tag === 'template'
			);
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
		case 'tbody':
		case 'thead':
		case 'tfoot':
			return (
				tag === 'tr' ||
				tag === 'style' ||
				tag === 'script' ||
				tag === 'template'
			);
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
		case 'colgroup':
			return tag === 'col' || tag === 'template';
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
		case 'table':
			return (
				tag === 'caption' ||
				tag === 'colgroup' ||
				tag === 'tbody' ||
				tag === 'tfoot' ||
				tag === 'thead' ||
				tag === 'style' ||
				tag === 'script' ||
				tag === 'template'
			);
		// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
		case 'head':
			return (
				tag === 'base' ||
				tag === 'basefont' ||
				tag === 'bgsound' ||
				tag === 'link' ||
				tag === 'meta' ||
				tag === 'title' ||
				tag === 'noscript' ||
				tag === 'noframes' ||
				tag === 'style' ||
				tag === 'script' ||
				tag === 'template'
			);
		// https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
		case 'html':
			return tag === 'head' || tag === 'body' || tag === 'frameset';
		case 'frameset':
			return tag === 'frame';
		case '#document':
			return tag === 'html';
	}

	// Probably in the "in body" parsing mode, so we outlaw only tag combos
	// where the parsing rules cause implicit opens or closes to be added.
	// https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
	switch (tag) {
		case 'h1':
		case 'h2':
		case 'h3':
		case 'h4':
		case 'h5':
		case 'h6':
			return (
				parent_tag !== 'h1' &&
				parent_tag !== 'h2' &&
				parent_tag !== 'h3' &&
				parent_tag !== 'h4' &&
				parent_tag !== 'h5' &&
				parent_tag !== 'h6'
			);

		case 'rp':
		case 'rt':
			return IMPLIED_END_TAGS.indexOf(parent_tag) === -1;

		case 'body':
		case 'caption':
		case 'col':
		case 'colgroup':
		case 'frameset':
		case 'frame':
		case 'head':
		case 'html':
		case 'tbody':
		case 'td':
		case 'tfoot':
		case 'th':
		case 'thead':
		case 'tr':
			// These tags are only valid with a few parents that have special child
			// parsing rules -- if we're down here, then none of those matched and
			// so we allow it only if we don't know what the parent is, as all other
			// cases are invalid.
			return parent_tag == null;
	}

	return true;
}

/**
 * @param {string} tag
 * @param {AncestorInfo} ancestor_info
 * @returns {?Info}
 */
function find_invalid_ancestor_for_tag (tag, ancestor_info) {
	switch (tag) {
		case 'address':
		case 'article':
		case 'aside':
		case 'blockquote':
		case 'center':
		case 'details':
		case 'dialog':
		case 'dir':
		case 'div':
		case 'dl':
		case 'fieldset':
		case 'figcaption':
		case 'figure':
		case 'footer':
		case 'header':
		case 'hgroup':
		case 'main':
		case 'menu':
		case 'nav':
		case 'ol':
		case 'p':
		case 'section':
		case 'summary':
		case 'ul':
		case 'pre':
		case 'listing':
		case 'table':
		case 'hr':
		case 'xmp':
		case 'h1':
		case 'h2':
		case 'h3':
		case 'h4':
		case 'h5':
		case 'h6':
			return ancestor_info.p_tag_in_button_scope;

		case 'form':
			return ancestor_info.form_tag || ancestor_info.p_tag_in_button_scope;

		case 'li':
			return ancestor_info.list_item_tag_autoclosing;

		case 'dd':
		case 'dt':
			return ancestor_info.dl_item_tag_autoclosing;

		case 'button':
			return ancestor_info.button_tag_in_scope;

		case 'a':
			// Spec says something about storing a list of markers, but it sounds
			// equivalent to this check.
			return ancestor_info.a_tag_in_scope;

		case 'nobr':
			return ancestor_info.no_br_tag_in_scope;
	}

	return null;
}

/**
 * @param {?string} child_tag
 * @param {?string} child_text
 * @param {AncestorInfo} ancestor_info
 * @returns {?{ message: string }}
 */
export function validate_dom_nesting (child_tag, child_text, ancestor_info = EMPTY_ANCESTOR_INFO) {
	let parent_info = ancestor_info.current;
	let parent_tag = parent_info && parent_info.tag;

	if (child_tag !== null) {
		assert(child_text === null, `expected child_text to be null when child_tag is present`);
	}
	else if (child_text !== null) {
		assert(child_tag === null, `expected child_tag to be null when child_text is present`);
		child_tag = '#text';
	}
	else {
		assert(false, `expected child_tag to be present`);
	}

	let invalid_parent = is_tag_valid_with_parent(child_tag, parent_tag)
		? null
		: parent_info;

	let invalid_ancestor = invalid_parent
		? null
		: find_invalid_ancestor_for_tag(child_tag, ancestor_info);

	let invalid_parent_or_ancestor = invalid_parent || invalid_ancestor;

	if (!invalid_parent_or_ancestor) {
		return null;
	}

	let ancestor_tag = invalid_parent_or_ancestor.tag;
	let tag_display_name = child_tag;

	if (child_tag === '#text') {
		if (/\S/.test(child_text)) {
			tag_display_name = 'text nodes';
		}
		else {
			tag_display_name = 'whitespace text nodes';
		}
	}
	else {
		tag_display_name = '<' + child_tag + '>';
	}

	return {
		message: invalid_parent
			? `${tag_display_name} cannot appear as a child of <${ancestor_tag}>`
			: `${tag_display_name} cannot appear as a descendant of <${ancestor_tag}>`,
	};
}
