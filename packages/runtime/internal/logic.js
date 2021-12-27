import { ref, effect, scope, cleanup, access } from './reactivity.js';
import { replace, remove_parts } from './dom.js';


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

	// [instance, marker, item]
	let parts = [];

	effect(() => {
		let items = expression();
		let index = 0;

		let items_len = items.length;
		let parts_len = parts.length;

		for (; index < items_len; index++) {
			if (parts[index]) {
				let item = parts[index][2];
				item(items[index]);
			}
			else {
				let prev = parts[index - 1];
				let start = prev ? prev[1] : marker;

				let item = ref(items[index]);
				let instance = scope(true);

				parts[index] = [instance, instance.run(() => block(start, item, index)), item];
			}
		}

		if (parts_len > items_len) {
			let prev = parts[index - 1];

			let start = prev ? prev[1] : marker;
			let end = parts[parts_len - 1][1];

			for (; index < parts_len; index++) {
				parts[index][0].stop();
			}

			destroy_block(start, end);
			parts.length = items_len;
		}
	});

	cleanup(() => {
		for (let [instance] of parts) {
			instance.stop();
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
	let uid = 0;

	resolved &&= resolved.bind(0, result);
	rejected &&= rejected.bind(0, error);

	effect(() => {
		let id = uid++;

		status(0);
		result(null);
		error(null);

		try {
			let promise = Promise.resolve(expression());

			promise.then(
				(val) => {
					if (uid === id) {
						result(val);
						status(2);
					}
				},
				(err) => {
					if (uid === id) {
						error(err);
						status(3);
					}
				},
			);

			queueMicrotask(() => {
				if (uid === id && status(access) === 0) {
					status(1);
				}
			});
		}
		catch (err) {
			error(err);
			status(3);

			throw err;
		}
	});

	show(marker, () => {
		let current = status(access);
		return current === 1 ? pending : current === 2 ? resolved : current === 3 ? rejected : null;
	});
}

export function keyed (marker, block, expression) {
	let init = true;
	let current;

	let end;
	let instance = scope();

	effect(() => {
		let key = expression();

		if (!init && key === current) {
			return;
		}

		if (end) {
			instance.clear();
			destroy_block(marker, end);
			end = null;
		}

		current = key;
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


function destroy_block (marker, end) {
	remove_parts(marker.nextSibling, end);
}
