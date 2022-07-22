import { ref, effect, scope, cleanup, Scope } from './reactivity.js';
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
			instance._clear();
			destroy_block(marker, end);
			end = null;
		}

		current = block;

		if (!block) {
			return;
		}

		end = instance._run(() => block(marker));
	});
}

export function each (marker, block, expression) {
	// we can't make the scope instances ahead of time, a cleanup hook is required
	// to clean up these detached scopes.

	/** @type {[instance: Scope, marker: Comment, item: any][]} */
	let parts = [];

	effect(() => {
		let items = expression();
		let index = 0;

		let items_len = items.length;
		let parts_len = parts.length;

		for (; index < items_len; index++) {
			if (parts[index]) {
				let item = parts[index][2];
				item.v = items[index];
			}
			else {
				let prev = parts[index - 1];
				let start = prev ? prev[1] : marker;

				let item = ref(items[index]);
				let instance = scope(true);

				parts[index] = [instance, instance._run(() => block(start, item, index)), item];
			}
		}

		if (parts_len > items_len) {
			let prev = parts[index - 1];

			let start = prev ? prev[1] : marker;
			let end = parts[parts_len - 1][1];

			for (; index < parts_len; index++) {
				parts[index][0]._stop();
			}

			destroy_block(start, end);
			parts.length = items_len;
		}
	});

	cleanup(() => {
		for (let part of parts) {
			let instance = part[0];
			instance._stop();
		}
	});
}

export function promise (marker, pending, resolved, rejected, expression) {
	// 0 = empty
	// 1 = pending
	// 2 = resolved
	// 3 = rejected

	let status = ref();
	let result = ref();
	let error = ref();
	let curr;

	resolved && (resolved = () => resolved(result));
	rejected && (rejected = () => rejected(error));

	effect(() => {
		let key = curr = {};

		status.v = 1;
		result.v = null;
		error.v = null;

		try {
			let promise = Promise.resolve(expression());

			promise.then(
				(val) => {
					if (curr === key) {
						result.v = val;
						status.v = 2;
					}
				},
				(err) => {
					if (curr === key) {
						status.v = 3;
						error.v = err;
					}
				},
			);
		}
		catch (err) {
			error.v = err;
			status.v = 3;
		}
	});

	show(marker, () => {
		let current = status.v;
		return current === 1 ? pending : current === 2 ? resolved : current === 3 ? rejected : null;
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
			instance._clear();
			destroy_block(marker, end);
			end = null;
		}

		init = true;
		curr = next;
		end = instance._run(() => block(marker));
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
		instance._clear();

		replace(host, (host = next ? instance._run(() => block(next)) : marker));
	});
}


function destroy_block (marker, end) {
	remove_parts(marker.nextSibling, end);
}
