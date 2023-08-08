import { remove_parts, replace } from './dom.js';
import { reconcile_dom } from './reconcile.js';
import { Scope, Signal, batch, cleanup, effect, eval_scope, scope, signal } from './signals.js';
import { is } from './utils.js';

let REUSED_MARKER = /* #__PURE__ */ Symbol();

export function text (marker, expression, insert) {
	let node = document.createTextNode('');

	insert(marker, node);
	effect(() => (node.data = expression()));
}

export function show (marker, expression) {
	let instance = scope();
	let current;
	let end;

	effect(() => {
		let block = expression();

		if (block === current) {
			return;
		}

		if (end) {
			instance.clear();
			destroy_block(marker, end);
			end = null;
		}

		current = block;

		if (!block) {
			return;
		}

		end = instance.run(() => block(marker));
	});
}

/** @typedef {[instance: Scope, marker: ChildNode]} FallbackPart */

export function each (marker, block, expression, fallback_block) {
	// we can't make the scope instances ahead of time, a cleanup hook is required
	// to clean up these detached scopes.

	/** @type {[instance: Scope, marker: ChildNode, item: Signal][]} */
	let parts = [];
	let depth = eval_scope._depth + 1;

	/** @type {?FallbackPart} */
	let fallback_part = null;

	effect(() => {
		let items = expression();
		let index = 0;

		let items_len = items.length;
		let parts_len = parts.length;

		if (fallback_block && fallback_part && items_len > 0) {
			let instance = fallback_part[0];
			let end = fallback_part[1];

			instance.clear();
			destroy_block(marker, end);

			fallback_part = null;
		}

		for (; index < items_len; index++) {
			if (parts[index]) {
				let item = parts[index][2];
				item.value = items[index];
			}
			else {
				let prev = parts[index - 1];
				let start = prev ? prev[1] : marker;

				let item = signal(items[index]);
				let instance = scope(true);
				instance._depth = depth;

				parts[index] = [instance, instance.run(() => block(start, item, index)), item];
			}
		}

		if (parts_len > items_len) {
			let prev = parts[index - 1];

			let start = prev ? prev[1] : marker;
			let end = parts[parts_len - 1][1];

			for (; index < parts_len; index++) {
				parts[index][0].clear();
			}

			destroy_block(start, end);
			parts.length = items_len;
		}

		if (fallback_block && !fallback_part && items_len < 1) {
			let instance = scope(true);
			instance._depth = depth;

			fallback_part = [instance, instance.run(() => fallback_block(marker))];
		}
	});

	cleanup(() => {
		for (let i = 0, l = parts.length; i < l; i++) {
			let part = parts[i];
			let instance = part[0];
			instance.clear();
		}
	});
}

export function keyed_each (marker, block, expression, get_key, fallback_block) {
	let depth = eval_scope._depth + 1;

	/** @typedef {[instance: Scope, item: Signal<any>, index: ?Signal<number>, marker: ChildNode, nodes: ChildNode[]]} KeyedPart */

	/** @type {KeyedPart[]} */
	let parts = [];
	/** @type {any[]} */
	let keys = [];
	/** @type {ChildNode[]} */
	let dom = [];

	/** @type {?FallbackPart} */
	let fallback_part = null;

	effect(() => {
		let items = expression();
		let idx = 0;

		let items_len = items.length;
		let parts_len = parts.length;

		/** @type {KeyedPart[]} */
		let next_parts = [];
		/** @type {any[]} */
		let next_keys = [];
		/** @type {ChildNode[]} */
		let next_dom = [];

		/** @type {number} */
		let _part_idx;
		/** @type {KeyedPart} */
		let _part;

		let _item;
		let _key;

		let _is_reused = false;

		if (fallback_block && fallback_part && items_len > 0) {
			let instance = fallback_part[0];
			let end = fallback_part[1];

			instance.clear();
			destroy_block(marker, end);

			fallback_part = null;
		}

		for (; idx < items_len; idx++) {
			_item = items[idx];
			_key = get_key(_item);

			_part_idx = keys.indexOf(_key);

			if (_part_idx !== -1) {
				_part = parts[_part_idx];

				_part[1].value = _item;
				_part[2].value = idx;

				next_dom = next_dom.concat(_part[4]);
				parts[_part_idx] = keys[_part_idx] = REUSED_MARKER;

				_is_reused = true;
			}
			else {
				let prev = next_parts[idx - 1];
				let start = prev ? prev[3] : marker;

				let item = signal(_item);
				let index = signal(idx);
				let instance = scope(true);

				let part_marker = instance.run(() => block(start, item, index));
				let part_dom = collect_part_dom(start.nextSibling, part_marker);

				instance._depth = depth;

				next_dom = next_dom.concat(part_dom);
				_part = [instance, item, index, part_marker, part_dom];
			}

			next_parts.push(_part);
			next_keys.push(_key);
		}

		for (idx = 0; idx < parts_len; idx++) {
			_part = parts[idx];

			if (_part !== REUSED_MARKER) {
				let dom = _part[4];

				_part[0].clear();
				remove_parts(dom[0], dom[dom.length - 1]);
			}
		}

		if (_is_reused) {
			reconcile_dom(marker.parentNode, dom, dom = next_dom);
		}
		else {
			dom = next_dom;
		}

		parts = next_parts;
		keys = next_keys;

		if (fallback_block && !fallback_part && items_len < 1) {
			let instance = scope(true);
			instance._depth = depth;

			fallback_part = [instance, instance.run(() => fallback_block(marker))];
		}
	});

	cleanup(() => {
		for (let i = 0, l = parts.length; i < l; i++) {
			let part = parts[i];
			let instance = part[0];
			instance.clear();
		}
	});
}

/**
 * @param {ChildNode | null} a
 * @param {ChildNode} b
 * @returns {ChildNode[]}
 */
function collect_part_dom (a, b) {
	/** @type {ChildNode[]} */
	let array = [];

	while (a) {
		array.push(a);

		if (a === b) {
			break;
		}

		a = a.nextSibling;
	}

	return array;
}

export function promise (marker, pending, resolved, rejected, expression) {
	// 0 = empty
	// 1 = pending
	// 2 = resolved
	// 3 = rejected

	let status = signal(0);
	let result = signal(null);

	let curr_key;
	let curr_promise;

	let resolved_block = resolved && ((marker) => resolved(marker, result));
	let rejected_block = rejected && ((marker) => rejected(marker, result));

	effect(() => {
		try {
			/** @type {Promise<unknown> | PromiseLike<unknown>} */
			let next = expression();
			let promisified = next instanceof Promise || 'then' in next ? next : Promise.resolve(next);

			if (curr_promise === promisified) {
				return;
			}

			let key = curr_key = {};

			curr_promise = promisified;

			result.value = null;
			status.value = 1;

			promisified.then(
				(val) => {
					if (curr_key === key) {
						batch(() => {
							result.value = val;
							status.value = 2;
						});
					}
				},
				(err) => {
					if (curr_key === key) {
						batch(() => {
							result.value = err;
							status.value = 3;
						});
					}
				},
			);
		}
		catch (err) {
			result.value = err;
			status.value = 3;
		}
	});

	show(marker, () => {
		let current = status.value;
		return current === 1 ? pending : current === 2 ? resolved_block : current === 3 ? rejected_block : null;
	});
}

export function keyed (marker, block, expression) {
	let init;
	let curr;

	let end;
	let instance = scope();

	effect(() => {
		let next = expression();

		if (init && is(next, curr)) {
			return;
		}

		if (end) {
			instance.clear();
			destroy_block(marker, end);
			end = null;
		}

		init = true;
		curr = next;
		end = instance.run(() => block(marker));
	});
}

export function dynamic (marker, block, expression) {
	let host = marker;
	let instance = scope();

	let current;

	effect(() => {
		let next = expression();

		if (next === current) {
			return;
		}

		current = next;
		instance.clear();

		replace(host, host = next ? instance.run(() => block(next)) : marker, false);
	});
}

function destroy_block (marker, end) {
	remove_parts(marker.nextSibling, end);
}
