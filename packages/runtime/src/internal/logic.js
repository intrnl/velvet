import { remove_parts, replace } from './dom.js';
import { Scope, Signal, batch, cleanup, effect, eval_scope, scope, signal } from './signals.js';
import { is } from './utils.js';

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

export function each (marker, block, expression) {
	// we can't make the scope instances ahead of time, a cleanup hook is required
	// to clean up these detached scopes.

	/** @type {[instance: Scope, marker: Comment, item: Signal][]} */
	let parts = [];
	let depth = eval_scope._depth + 1;

	effect(() => {
		let items = expression();
		let index = 0;

		let items_len = items.length;
		let parts_len = parts.length;

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
	});

	cleanup(() => {
		for (let i = 0, l = parts.length; i < l; i++) {
			let part = parts[i];
			let instance = part[0];
			instance.clear();
		}
	});
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
			let next = expression();
			let promisified = next instanceof Promise ? next : Promise.resolve(next);

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
