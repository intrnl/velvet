import { Array, Set } from '../internal/globals.js';
import { noop, is } from '../internal/utils.js';


export function get (store) {
	let value;
	let unsubscribe = store.subscribe((_value) => value = _value);

	unsubscribe();
	return value;
}

let queue = [];

export function writable (value, notifier = noop) {
	let stop;

	let subscribers = new Set();
	let invalidators = new Set();

	let set = (next) => {
		if (!is(value, next)) {
			value = next;

			if (stop) {
				let should_flush = !queue.length;

				for (let invalidate of invalidators) {
					invalidate();
				}

				queue.push([subscribers, next]);

				if (should_flush) {
					for (let [subscribers, value] of queue) {
						for (let listener of subscribers) {
							listener(value);
						}
					}

					queue.length = 0;
				}
			}
		}

		return next;
	};

	let update = (updater) => set(updater(value));

	let subscribe = (listener, invalidate = noop) => {
		subscribers.add(listener);
		invalidators.add(invalidate);

		if (subscribers.size === 1) {
			stop = notifier(set) || noop;
		}

		listener(value);

		return () => {
			subscribers.delete(listener);
			invalidators.delete(invalidate);

			if (subscribers.size === 0) {
				stop();
				stop = null;
			}
		};
	};

	return { set, update, subscribe };
}

export function readable (value, notifier) {
	let instance = writable(value, notifier);
	return { subscribe: instance.subscribe };
}

export function derived (derives, fn, initial_value) {
	let single = !Array.isArray(derives);
	let stores = single ? [derives] : derives;

	let auto = fn.length < 2;

	return readable(initial_value, (set) => {
		let init = false;

		let values = [];
		let pending = 0;

		let cleanup = noop;

		let sync = () => {
			if (!init || pending) {
				return;
			}

			cleanup();

			let result = fn(single ? values[0] : values, set);

			if (auto) {
				set(result);
			}
			else {
				cleanup = typeof result === 'function' ? result : noop;
			}
		};

		let unsubcriptions = stores.map((store, index) => (
			store.subscribe(
				(value) => {
					values[index] = value;
					pending &= ~(1 << index);
					sync();
				},
				() => {
					pending |= (1 << index);
				},
			)
		));

		init = true;
		sync();

		return () => {
			for (let stop of unsubcriptions) {
				stop();
			}

			cleanup();
		};
	});
}
