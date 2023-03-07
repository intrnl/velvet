import { curr_host } from './component.js';
import { on } from './dom.js';

let event_name = 'context-request';

/**
 * @param {string | symbol} key
 * @param {any} value
 */
export function provide (key, value) {
	/** @param {ContextEvent} event */
	let listener = (event) => {
		if (event.context === key) {
			event.stopImmediatePropagation();
			event.callback(value, null);
		}
	};

	on(curr_host, event_name, listener);
}

/**
 * @template T
 * @param {string | symbol} key
 * @param {T} [def]
 * @returns {T | undefined}
 */
export function inject (key, def) {
	let value = def;

	/**
	 * @param {any} next
	 * @param {() => void} [dispose]
	 */
	let callback = (next, dispose) => {
		dispose?.();
		value = next;
	};

	let event = new ContextEvent(key, callback, false);
	curr_host.dispatchEvent(event);

	return value;
}

export class ContextEvent extends Event {
	constructor (context, callback, multiple) {
		super(event_name, { bubbles: true, composed: true });

		this.context = context;
		this.callback = callback;
		this.multiple = multiple;
	}
}
