import { Object, Symbol } from './globals.js';
import { Computed, Signal, cleanup, computed, effect, scope, signal } from './signals.js';
import { assign, hyphenate, is_function } from './utils.js';

let ENABLE_RANDOM_TAGS = false;
let RANDOM_TAG = 1;

export function use_random_tags () {
	ENABLE_RANDOM_TAGS = true;
}

// props are assigned its default values only when it's uncontrolled, so the
// refs starts with a unique symbol, and we only assign if it's still present.

/** @type {VelvetComponent | null} */
export let curr_host = null;
export let default_value = Symbol();

export class VelvetComponent extends HTMLElement {
	// static $c: setup function
	// static $a: attr to prop definition
	// static $d: prop definitions
	// static $s: stylesheets

	/** is mounted */
	$m = false;
	/** scope instance */
	$c = scope(true);
	/** @type {Record<number, Signal>} props */
	$p = {};
	/** on mount hooks */
	$h = [];

	constructor () {
		super();

		let host = this;
		let props = host.$p;

		let definition = host.constructor.$d;

		for (let prop in definition) {
			let index = definition[prop];
			props[index] = signal(default_value);
		}
	}

	connectedCallback () {
		let host = this;

		if (!host.$m) {
			host.$m = true;

			let setup = host.constructor.$c;
			let styles = host.constructor.$s;

			let instance = host.$c;
			let hooks = host.$h;

			let root = host.shadowRoot;

			if (!root) {
				root = host.attachShadow({ mode: 'open' });
				root.adoptedStyleSheets = styles;
			}

			let prev_host = curr_host;

			try {
				curr_host = host;
				instance.run(() => setup(root, host));

				for (let idx = 0, len = hooks.length; idx < len; idx++) {
					let hook = hooks[idx];
					let ret = hook();

					if (is_function(ret)) {
						instance.cleanups.push(ret);
					}
				}

				hooks.length = 0;
			}
			finally {
				curr_host = prev_host;
			}
		}
	}

	disconnectedCallback () {
		let host = this;

		if (host.$m) {
			host.$c.clear();
			host.shadowRoot.innerHTML = '';

			host.$m = false;
		}
	}

	attributeChangedCallback (attr, prev, next) {
		let host = this;
		let mapping = host.constructor.$d;

		// toggleAttribute: ''
		// removeAttribute: null

		if (attr in mapping) {
			host.$p[mapping[attr]].value = next === '' ? true : next;
		}
	}
}

export function define (tag, setup, definition, styles) {
	let observed_attrs = [];
	let attr_to_prop = Object.create(null);

	class Component extends VelvetComponent {
		static observedAttributes = observed_attrs;

		static $c = setup;
		static $a = attr_to_prop;
		static $d = definition;
		static $s = styles;
	}

	for (let prop in definition) {
		let index = definition[prop];
		let hyphen = hyphenate(prop);

		attr_to_prop[hyphen] = prop;
		observed_attrs.push(hyphen);

		Object.defineProperty(Component.prototype, prop, {
			/** @this VelvetComponent */
			get () {
				// accessing props here shouldn't trigger effect tracking.
				return this.$p[index]._value;
			},
			/** @this VelvetComponent */
			set (next) {
				this.$p[index].value = next;
			},
		});
	}

	if (ENABLE_RANDOM_TAGS) {
		tag = 'velvet-' + RANDOM_TAG++;
	}

	if (tag) {
		customElements.define(tag, Component);
	}

	return Component;
}

export function css (text) {
	const style = new CSSStyleSheet();
	style.replaceSync(text);

	return style;
}

export function prop (index, value) {
	let state = curr_host.$p[index];

	if (state.value === default_value) {
		// we're trying to mimic default values in a function parameter, where
		// values are only instantiated when the argument is undefined.

		// we'd wrap non-primitive values like functions and objects, or if we're
		// referencing an identifier.

		state.value = is_function(value) ? value() : value;
	}

	return state;
}

export function on_mount (fn) {
	if (is_function(fn)) {
		curr_host.$h.push(fn);
	}
}

export function event_dispatcher () {
	let host = curr_host;

	return (type, detail) => {
		let event = new CustomEvent(type, { detail, bubbles: false });
		host.dispatchEvent(event);
	};
}

export function bind (obj) {
	assign(curr_host, obj);
}

export function use (node, action, getter) {
	/** @type {Computed | undefined} */
	let ref = getter && computed(getter);
	let instance = action(node, ref && ref.value);

	if (!instance) {
		return;
	}

	if (is_function(instance.destroy)) {
		cleanup(() => instance.destroy());
	}

	if (ref && ref._sources && is_function(instance.update)) {
		let init = false;

		effect(() => {
			let next = ref.value;

			if (!init) {
				init = true;
				return;
			}

			instance.update(next);
		});
	}
}
