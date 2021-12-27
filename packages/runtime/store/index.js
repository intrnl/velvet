import { Array, Set } from '../internal/globals.js';
import { noop, is } from '../internal/utils.js';


export function writable (value, notifier) {
	return new Writable(value, notifier);
}

export function readable (value, notifier) {
	let instance = writable(value, notifier);
	return { subscribe: instance.subscribe.bind(instance) };
}

export function derived (derives, fn, initial_value) {
	let single = !Array.isArray(derives);
	let stores = single ? [derives] : derives;

	let auto = fn.length < 2;

	return readable(initial_value, (set) => {
		let init = false;
		let values = [];
		let cleanup = noop;

		let sync = () => {
			if (!init) {
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
			store.subscribe((value) => {
				values[index] = value;
				sync();
			})
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

class Writable {
	/** notifier start */
	n;
	/** notifier stop */
	u;
	/** current value */
	v;

	/** subscribers */
	s = new Set();

	constructor (value, notifier = noop) {
		let _this = this;

		_this.v = value;
		_this.n = notifier;
	}

	set (next) {
		let _this = this;

		if (!is(_this.v, next)) {
			_this.v = next;

			if (_this.u) {
				for (let subscriber of _this.s) {
					subscriber(next);
				}
			}
		}
	}

	update (updater) {
		let _this = this;
		_this.set(updater(_this.v));
	}

	subscribe (listener) {
		let _this = this;
		let subscribers = _this.s;
		let stop = _this.u;

		subscribers.add(listener);

		if (subscribers.size === 1) {
			stop = _this.u = _this.n((next) => _this.set(next));
		}

		listener(_this.v);

		return () => {
			subscribers.delete(listener);

			if (subscribers.size === 0) {
				stop();
				_this.u = null;
			}
		};
	}
}
