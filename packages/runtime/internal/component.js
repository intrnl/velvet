import { ref, scope, access } from './reactivity.js';
import { hyphenate, camelize } from './utils.js';
import { Symbol, Object } from './globals.js';

// props are assigned its default values only when it's uncontrolled, so the
// refs starts with a unique symbol, and we only assign if it's still present.

/** @type {VelvetComponent | null} */
export let curr_host = null;
export let default_value = Symbol();

class VelvetComponent extends HTMLElement {
	/** setup function */
	$s;

	/** is mounted */
	$m = false;
	/** scope instance */
	$c = scope(true);
	/** props */
	$p = {};
	/** on mount hooks */
	$h = [];

	constructor (setup, definition) {
		super();

		let host = this;
		let props =	host.$p;

		host.$s = setup;

		for (let prop in definition) {
			let index = definition[prop];
			props[index] = ref(default_value);
		}
	}

	connectedCallback () {
		let host = this;

		if (!host.$m) {
			host.$m = true;

			let root = host.shadowRoot || host.attachShadow({ mode: 'open' });

			let setup = host.$s;
			let instance = host.$c;
			let hooks = host.$h;

			let prev_host = curr_host;

			try {
				curr_host = host;
				instance.run(() => setup(root, host));

				for (let hook of hooks) {
					hook();
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
		let prop = camelize(attr);

		host[prop] = next;
	}
}


export function define (tag, setup, definition) {
	class Component extends VelvetComponent {
		static tagName = tag;
		static observedAttributes = Object.keys(definition).map(hyphenate);

		constructor () {
			super(setup, definition);
		}
	}

	for (let prop in definition) {
		let index = definition[prop];

		Object.defineProperty(Component.prototype, prop, {
			get () {
				// accessing a property value should NOT trigger effects. two-way
				// bindings between components should involve events.

				return this.$p[index](access, false);
			},
			set (next) {
				return this.$p[index](next);
			},
		});
	}

	customElements.define(tag, Component);
	return Component;
}

export function property (index, value) {
	let state = curr_host.$p[index];

	if (state(access) === default_value) {
		// we're trying to mimic default values in a function parameter, where
		// values are only instantiated when the argument is undefined.

		// we'd wrap non-primitive values like functions and objects, or if we're
		// referencing an identifier.

		state(typeof value === 'function' ? value() : value);
	}

	return state;
}

export function on_mount (fn) {
	curr_host.$h.push(fn);
}

export function event_dispatcher () {
	let host = curr_host;

	return (type, detail) => {
		let event = new CustomEvent(type, { detail, bubbles: false });
		host.dispatchEvent(event);
	};
}

export function bind (obj) {
	Object.assign(curr_host, obj);
}
