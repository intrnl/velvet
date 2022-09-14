import { batch, signal, effect, scope, cleanup, Scope, Signal } from './signals.js';
import { replace, remove_parts } from './dom.js';
import { is } from './utils.js';


export function text (marker, expression) {
	let node = document.createTextNode('');
	replace(marker, node);

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
		for (let part of parts) {
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

	let status = signal();
	let result = signal();
	let error = signal();
	let curr;

	let resolved_block = resolved && ((marker) => resolved(marker, result));
	let rejected_block = rejected && ((marker) => rejected(marker, result));

	effect(() => {
		let key = curr = {};

		status.value = 1;
		result.value = null;
		error.value = null;

		try {
			let promise = Promise.resolve(expression());

			promise.then(
				(val) => {
					if (curr === key) {
						batch(() => {
							status.value = 2;
							result.value = val;
						});
					}
				},
				(err) => {
					if (curr === key) {
						batch(() => {
							status.value = 3;
							error.value = err;
						});
					}
				},
			);
		}
		catch (err) {
			status.value = 3;
			error.value = err;
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

		replace(host, (host = next ? instance.run(() => block(next)) : marker));
	});
}

export function subscribe (store) {
	// If we're dealing with signals, we don't really need to do anything here.
	if (store instanceof Signal) {
		return store;
	}

	let ref = signal();
	cleanup(store.subscribe((value) => ref.value = value));

	return ref;
}


function destroy_block (marker, end) {
	remove_parts(marker.nextSibling, end);
}
