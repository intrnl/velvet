// forked version of @preactjs/signals
// https://github.com/preactjs/signals

import { Set } from './globals.js';
import { is_function } from './utils.js';


/** @type {?Scope} */
let current_scope = null;
/** @type {?Signal} */
let current_signal = null;

/** @type {Set<Signal>} */
let old_deps = new Set();

/** @type {?Set<Signal>} */
let batch_pending = null;

/** @type {Array<Signal>} */
let temp_pending = [];

/** @type {?Error} */
let commit_error = null;

export class Scope {
	/** @type {?Scope} */
	parent = null;

	/** @type {Scope[]} */
	scopes = [];
	/** @type {Array<() => void>} */
	cleanups = [];

	/**
	 * @param {boolean} [detached]
	 */
	constructor (detached) {
		let _this = this;

		if (!detached && current_scope) {
			current_scope.scopes.push(_this);
			_this.parent = current_scope;
		}
	}

	/**
	 * Run callback inside scope
	 * @template T
	 * @param {() => T} fn
	 * @returns {T}
	 */
	run (fn) {
		let prev_scope = current_scope;

		try {
			current_scope = this;
			return fn();
		}
		finally {
			current_scope = prev_scope;
		}
	}

	/**
	 * Clear scope
	 */
	clear () {
		let _this = this;

		let cleanups = _this.cleanups;
		let scopes = _this.scopes;

		for (let cleanup of cleanups) {
			cleanup();
		}

		for (let scope of scopes) {
			scope.parent = null;
			scope.clear();
		}

		cleanups.length = 0;
		scopes.length = 0;
	}
}

/**
 * @template T
 */
export class Signal {
	/** @private @type {T} */
	_value;

	/** @private @type {Set<Signal>} */
	_subscribers = new Set();
	/** @private @type {Set<Signal>} */
	_dependencies = new Set();

	/** @private @type {number} */
	_pending = 0;
	/** @private @type {boolean} */
	_dirty = false;
	/** @private @type {boolean} */
	_active = false;
	/** @private @type {boolean} */
	_locked = false;

	/**
	 * @param {T} value
	 */
	constructor (value) {
		this._value = value;
	}

	/**
	 * @returns {T}
	 */
	peek () {
		return this._value;
	}

	/**
	 * @param {T} value
	 * @returns {T}
	 */
	set (value) {
		return this.value = value;
	}

	/**
	 * @param {(value: T) => void} fn
	 * @returns {() => void}
	 */
	subscribe (fn) {
		return effect(() => fn(this.value));
	}

	/**
	 * @type {T}
	 */
	get value () {
		let _this = this;

		if (!_this._active) {
			activate(_this);
		}

		if (current_signal) {
			this._subscribers.add(current_signal);
			current_signal._dependencies.add(_this);

			old_deps.delete(_this);
		}

		return this._value;
	}

	set value (next) {
		let _this = this;

		if (_this._value !== next) {
			_this._value = next;

			batch(() => {
				batch_pending.add(_this);

				if (this._pending === 0) {
					mark(_this);
				}
			});
		}
	}

	/** @private Update function */
	_updater () {}

	/**
	 * @private Start read operation
	 * @returns {(unmark: boolean, cleanup: boolean) => void} Call to end read operation
	 */
	_setCurrent () {
		let _this = this;

		let prev_signal = current_signal;
		let prev_old_deps = old_deps;

		current_signal = _this;
		old_deps = _this._dependencies;

		_this._dependencies = new Set();

		return (should_unmark, should_cleanup) => {
			if (should_unmark) {
				for (let sub of _this._subscribers) {
					unmark(sub);
				}
			}

			for (let dep of old_deps) {
				(should_cleanup ? unsubscribe : subscribe)(_this, dep);
			}

			old_deps.clear();
			old_deps = prev_old_deps;

			current_signal = prev_signal;
		};
	}
}

/**
 * @param {Signal} signal
 */
function mark (signal) {
	if (signal._pending++ === 0) {
		for (let sub of signal._subscribers) {
			mark(sub);
		}
	}
}

/**
 * @param {Signal} signal
 */
function unmark (signal) {
	if (!signal._dirty && signal._pending > 0 && --signal._pending === 0) {
		for (let sub of signal._subscribers) {
			unmark(sub);
		}
	}
}

/**
 * @param {Set<Signal>} set
 */
function sweep (set) {
	for (let signal of set) {
		if (signal._pending > 0) {
			signal._dirty = true;

			if (--signal._pending === 0) {
				if (signal._locked) {
					continue;
				}

				signal._dirty = false;

				signal._locked = true;
				signal._updater();
				signal._locked = false;

				sweep(signal._subscribers);
			}
		}
	}
}

/**
 * @param {Signal} signal
 * @param {Signal} to
 */
function subscribe (signal, to) {
	signal._active = true;

	signal._dependencies.add(to);
	to._subscribers.add(signal);
}

/**
 * @param {Signal} signal
 * @param {Signal} from
 */
function unsubscribe (signal, from) {
	signal._dependencies.delete(from);
	from._subscribers.delete(signal);

	if (from._subscribers.size === 0) {
		from._active = false;

		for (let dep of from._dependencies) {
			unsubscribe(from, dep);
		}
	}
}

/**
 * @param {Signal} signal
 */
function refresh (signal) {
	if (batch_pending) {
		batch_pending.delete(signal);
	}

	signal._pending = 0;

	signal._locked = true;
	signal._updater();
	signal._locked = false;

	if (commit_error) {
		let err = commit_error;
		commit_error = null;

		throw err;
	}

	for (let sub of signal._subscribers) {
		if (sub._pending > 0) {
			if (sub._pending > 1) {
				sub._pending--;
			}

			temp_pending.push(sub);
		}
	}
}

/**
 * @param {Signal} signal
 */
function activate (signal) {
	signal._active = true;
	refresh(signal);
}


/**
 * @param {boolean} [detached]
 * @returns {Scope}
 */
export function scope (detached) {
	return new Scope(detached);
}

/**
 * @template T
 * @param {T} value
 * @returns {Signal<T>}
 */
export function signal (value) {
	return new Signal(value);
}

/**
 * @template T
 * @param {() => T} compute
 * @returns {Signal<T>}
 */
export function computed (compute) {
	let s = new Signal(undefined);

	s._updater = () => {
		let finish = s._setCurrent();

		try {
			let ret = compute();

			finish(s._value === ret, true);
			s._value = ret;
		}
		catch (error) {
			if (!commit_error) {
				commit_error = error;
			}

			finish(true, false);
		}
	};

	return s;
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function batch (fn) {
	if (batch_pending !== null) {
		return fn();
	}

	let pending = new Set();
	batch_pending = pending;

	try {
		return fn();
	}
	finally {
		/** @type {Signal | undefined} */
		let item;

		while (item = temp_pending.pop()) {
			pending.add(item);
		}

		batch_pending = null;

		sweep(pending);

		if (commit_error) {
			let err = commit_error;
			commit_error = null;

			throw err;
		}
	}
}

/**
 * @param {() => void} callback
 * @returns {() => void} Destroy effect
 */
export function effect (callback) {
	let s = computed(() => batch(callback));
	let cleanup = () => s._setCurrent()(true, true);

	activate(s);

	if (current_scope) {
		current_scope.cleanups.push(cleanup);
	}

	return cleanup;
}

export function cleanup (fn) {
	if (current_scope && is_function(fn)) {
		current_scope.cleanups.push(fn);
	}
}
