import { is_function } from './utils.js';

let undefined;

// `MAYBE_OUTDATED` exists because Computed has an additional check for equality
// so it can only be stale if the resulting compute results in a different value

let FLAG_RUNNING = 1 << 0;
let FLAG_NOTIFIED = 1 << 1;
let FLAG_OUTDATED = 1 << 2;
let FLAG_MAYBE_OUTDATED = 1 << 3;
let FLAG_DISPOSED = 1 << 4;
let FLAG_TRACKING = 1 << 5;
let FLAG_HAS_ERROR = 1 << 6;

/** @type {Scope | undefined} */
export let curr_scope;

/** @type {Computed | Effect | undefined} */
let curr_context;
/** @type {Array<Signal> | undefined} */
let curr_sources;
/** @type {number} */
let curr_sources_idx = 0;

/** @type {Array<Effect> | undefined} */
let batch_queue;
/** @type {number} */
let batch_depth = 0;
/** @type {number} */
let batch_iteration = 0;

function start_batch () {
	batch_depth++;
}

function end_batch () {
	if (batch_depth > 1) {
		batch_depth--;
		return;
	}

	let error;
	let has_error = false;

	while (batch_queue) {
		let effects = batch_queue.sort((a, b) => a._depth - b._depth);
		let idx = 0;
		let len = effects.length;

		batch_queue = undefined;
		batch_iteration++;

		for (; idx < len; idx++) {
			let effect = effects[idx];
			effect._flags &= ~FLAG_NOTIFIED;

			if (!(effect._flags & FLAG_DISPOSED) && needs_recompute(effect)) {
				try {
					effect._run();
				}
				catch (err) {
					if (!has_error) {
						error = err;
						has_error = true;
					}
				}
			}
		}
	}

	batch_iteration = 0;
	batch_depth--;

	if (has_error) {
		throw error;
	}
}

/**
 * @param {Computed | Effect} target
 */
function needs_recompute (target) {
	// We've been notified that we *might* be stale, so try asking our sources if
	// there's anything actually new.
	if (target._flags & FLAG_MAYBE_OUTDATED) {
		let sources = target._sources;
		let len = sources.length;
		let idx = 0;

		for (; idx < len; idx++) {
			if (target._flags & FLAG_OUTDATED) {
				break;
			}

			sources[idx]._refresh();
		}

		// We're no longer *maybe* stale at this point, unset the flag
		target._flags &= ~FLAG_MAYBE_OUTDATED;
	}

	// We don't unset `OUTDATED` here, Computed values can't be stale if the new
	// value is the same as the current one.
	return (target._flags & FLAG_OUTDATED) !== 0;
}

function cleanup_context () {
	let sources = curr_context._sources;

	if (curr_sources) {
		prune_context_sources();

		if (curr_sources_idx > 0) {
			let l = curr_sources.length;
			let i = 0;

			sources.length = curr_sources_idx + l;

			for (; i < l; i++) {
				sources[curr_sources_idx + i] = curr_sources[i];
			}
		}
		else {
			sources = curr_context._sources = curr_sources;
		}

		if (curr_context._flags & FLAG_TRACKING) {
			let len = sources.length;
			let idx = curr_sources_idx;

			for (; idx < len; idx++) {
				let source = sources[idx];
				source._subscribe(curr_context);
				source._node = undefined;
			}
		}
	}
	else if (curr_sources_idx < curr_context._sources.length) {
		prune_context_sources();
		sources.length = curr_sources_idx;
	}

	while (curr_sources_idx--) {
		let source = sources[curr_sources_idx];
		source._node = undefined;
	}
}

function prune_context_sources () {
	let sources = curr_context._sources;

	let len = sources.length;
	let idx = curr_sources_idx;

	for (; idx < len; idx++) {
		let source = sources[idx];
		source._unsubscribe(curr_context);
		source._node = undefined;
	}
}

/**
 * @param {Effect} effect
 */
function dispose_effect (effect) {
	let sources = effect._sources;
	let len = sources.length;
	let idx = 0;

	for (; idx < len; idx++) {
		sources[idx]._unsubscribe(effect);
	}

	sources.length = 0;
}

/**
 * @template T
 */
export class Signal {
	/**
	 * @param {T} value
	 */
	constructor (value) {
		/** @internal @type {T} */
		this._value = value;
		/** @internal @type {Array<Computed | Effect>} */
		this._targets = [];
		/** @internal @type {Compueted | Effect | undefined} */
		this._node = undefined;
	}

	/**
	 * @internal
	 * @returns {boolean}
	 */
	_refresh () {
		return false;
	}

	/**
	 * @internal
	 * @param {Computed | Effect} target
	 */
	_subscribe (target) {
		let _this = this;

		_this._targets.push(target);
	}

	/**
	 * @internal
	 * @param {Computed | Effect} target
	 */
	_unsubscribe (target) {
		let _this = this;
		let targets = _this._targets;
		let idx = targets.indexOf(target);

		targets.splice(idx, 1);
	}

	/**
	 * @param {(value: T) => void} fn
	 */
	subscribe (fn) {
		let _this = this;

		return effect(() => {
			let curr_context = curr_context;
			let value = _this.value;

			try {
				curr_context = undefined;
				fn(value);
			}
			finally {
				curr_context = curr_context;
			}
		});
	}

	/**
	 * @param {T} next
	 * @returns {T}
	 */
	set (next) {
		return this.value = next;
	}

	/**
	 * @returns {T}
	 */
	peek () {
		let _this = this;
		return _this._value;
	}

	/** @type {T} */
	get value () {
		let _this = this;

		if (curr_context && _this._node !== curr_context) {
			// Mark the current context, there's no need to add ourselves again to the
			// dependency list if we're already in it, will be unset during cleanup
			_this._node = curr_context

			if (!curr_sources && curr_context._sources[curr_sources_idx] === _this) {
				curr_sources_idx++;
			}
			else if (!curr_sources) {
				curr_sources = [_this];
			}
			else {
				curr_sources.push(_this);
			}
		}

		return _this._value;
	}
	set value (next) {
		let _this = this;

		if (_this._value !== next) {
			_this._value = next;

			if (batch_iteration < 100) {
				let targets = _this._targets;
				let len = targets.length;
				let idx = 0;

				/* @__INLINE__ */ start_batch();

				try {
					for (; idx < len; idx++) {
						targets[idx]._notify(FLAG_OUTDATED);
					}
				}
				finally {
					end_batch();
				}
			}
		}
	}
}

/**
 * @template T
 * @extends {Signal<T>}
 */
export class Computed extends Signal {
	/**
	 * @param {() => T} compute
	 */
	constructor (compute) {
		super();

		/** @internal @type {() => T} */
		this._compute = compute;
		/** @internal @type {Array<Signal>} */
		this._sources = [];
		/** @internal @type {number} */
		this._flags = FLAG_OUTDATED;
	}

	/**
	 * @internal
	 */
	_refresh () {
		let _this = this;

		let stale = false;
		let next;

		_this._flags &= ~FLAG_NOTIFIED;

		// We hit a cycle, or we've already been used in a context
		if ((_this._flags & FLAG_RUNNING) || _this._node) {
			return false;
		}

		_this._flags |= FLAG_RUNNING;

		// We're currently tracking our sources, so check if there's anything new
		if ((_this._flags & FLAG_TRACKING) && !needs_recompute(_this)) {
			_this._flags &= ~FLAG_RUNNING;
			return false;
		}

		let prev_context = curr_context;
		let prev_sources = curr_sources;
		let prev_sources_idx = curr_sources_idx;

		try {
			curr_context = _this;
			curr_sources = undefined;
			curr_sources_idx = 0;

			next = _this._compute();
			stale = next !== _this._value;
		}
		catch (err) {
			next = err;
			stale = true;

			_this._flags |= FLAG_HAS_ERROR;
		}

		cleanup_context();

		_this._value = next;
		_this._flags &= ~FLAG_RUNNING;

		curr_context = prev_context;
		curr_sources = prev_sources;
		curr_sources_idx = prev_sources_idx;

		// We're stale now, mutate our targets to notify that they are indeed outdated
		if (stale) {
			let targets = _this._targets;
			let len = targets.length;
			let idx = 0;

			for (; idx < len; idx++) {
				targets[idx]._flags |= FLAG_OUTDATED;
			}
		}
	}

	/**
	 * @internal
	 * @param {Computed | Effect} target
	 */
	_subscribe (target) {
		let _this = this;

		// Subscribe to our sources now that we have someone subscribing on us
		if (_this._targets.length < 1) {
			let sources = _this._sources;
			let len = sources.length;
			let idx = 0;

			_this._flags |= FLAG_TRACKING;

			for (; idx < len; idx++) {
				sources[idx]._subscribe(_this);
			}
		}

		super._subscribe(target);
	}

	/**
	 * @internal
	 * @param {Computed | Effect} target
	 */
	_unsubscribe (target) {
		let _this = this;

		super._unsubscribe(target);

		// Unsubscribe from our sources since there's no one subscribing to us
		if (_this._targets.length < 1) {
			let sources = _this._sources;
			let len = sources.length;
			let idx = 0;

			_this._flags &= ~FLAG_TRACKING;

			for (; idx < len; idx++) {
				sources[idx]._unsubscribe(_this);
			}
		}
	}

	/**
	 * @internal
	 * @param {number} flag Either `OUTDATED` or `MAYBE_OUTDATED`
	 */
	_notify (flag) {
		let _this = this;

		if (!(_this._flags & (FLAG_NOTIFIED | FLAG_RUNNING))) {
			let targets = _this._targets;
			let len = targets.length;
			let idx = 0;

			_this._flags |= FLAG_NOTIFIED | flag;

			for (; idx < len; idx++) {
				targets[idx]._notify(FLAG_MAYBE_OUTDATED);
			}
		}
	}

	peek () {
		let _this = this;

		_this._refresh();

		if (_this._flags & FLAG_HAS_ERROR) {
			throw _this._value;
		}

		return _this._value;
	}

	get value () {
		let _this = this;

		_this._refresh();

		if (_this._flags & FLAG_HAS_ERROR) {
			throw super.value;
		}

		return super.value;
	}
	set value (next) {
		super.value = next;
	}
}

export class Effect {
	constructor (compute) {
		/** @internal @type {() => void} */
		this._compute = compute;
		/** @internal @type {Array<Signal>} */
		this._sources = [];
		/** @internal @type {number} */
		this._flags = FLAG_TRACKING;
		/** @internal @type {number} */
		this._depth = 0;
	}

	/**
	 * @internal
	 */
	_run () {
		let _this = this;

		if (_this._flags & FLAG_RUNNING) {
			return;
		}

		_this._flags |= FLAG_RUNNING;
		_this._flags &= ~FLAG_OUTDATED;

		let prev_context = curr_context;
		let prev_sources = curr_sources;
		let prev_sources_idx = curr_sources_idx;

		try {
			/* @__INLINE__ */ start_batch();

			curr_context = _this;
			curr_sources = undefined;
			curr_sources_idx = 0;

			_this._compute();
		}
		finally {
			cleanup_context();

			curr_context = prev_context;
			curr_sources = prev_sources;
			curr_sources_idx = prev_sources_idx;

			_this._flags &= ~FLAG_RUNNING;

			if (_this._flags & FLAG_DISPOSED) {
				dispose_effect(_this);
			}

			end_batch();
		}
	}

	_dispose () {
		let _this = this;

		_this._flags |= FLAG_DISPOSED;

		if (!(_this._flags & FLAG_RUNNING)) {
			dispose_effect(_this);
		}
	}

	/**
	 * @internal
	 * @param {number} flag Either `OUTDATED` or `MAYBE_OUTDATED`
	 */
	_notify (flag) {
		let _this = this;

		if (!(_this._flags & (FLAG_NOTIFIED | FLAG_RUNNING))) {
			_this._flags |= FLAG_NOTIFIED | flag;
			(batch_queue ||= []).push(_this);
		}
	}
}

export class Scope {
	/**
	 * @param {boolean} [detached]
	 */
	constructor (detached) {
		let _this = this;

		/** @type {Scope[]} */
		_this.scopes = [];
		/** @type {(() => void)[]} */
		_this.cleanups = [];
		/** @type {Scope | undefined} */
		_this.parent = undefined;
		/** @internal @type {number} */
		_this._depth = 0;

		if (!detached && curr_scope) {
			_this.parent = curr_scope;
			_this._depth = curr_scope._depth + 1;

			curr_scope.scopes.push(_this);
		}
	}

	/**
	 * @template {T}
	 * @param {() => T} callback
	 * @returns {T}
	 */
	run (callback) {
		let prev_scope = curr_scope;

		try {
			curr_scope = this;
			return callback();
		}
		finally {
			curr_scope = prev_scope;
		}
	}

	clear () {
		let _this = this;
		let scopes = _this.scopes;
		let cleanups = _this.cleanups;

		for (let scope of scopes) {
			scope.clear();
			scope.parent = undefined;
		}

		for (let cleanup of cleanups) {
			cleanup();
		}

		scopes.length = 0;
		cleanups.length = 0;
	}
}


export function scope (detached) {
	return new Scope(detached);
}

export function cleanup (callback) {
	if (is_function(callback) && curr_scope) {
		curr_scope.cleanups.push(callback);
	}
}

export function batch (callback) {
	if (batch_depth > 0) {
		return callback();
	}

	/* @__INLINE__ */ start_batch();

	try {
		return callback();
	}
	finally {
		end_batch();
	}
}

export function untrack (callback) {
	let prev_context = curr_context;

	try {
		curr_context = undefined;
		return callback();
	}
	finally {
		curr_context = prev_context;
	}
}

export function peek (value) {
	if (value instanceof Signal) {
		return value.peek();
	}

	return value;
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
 * @returns {Computed<T>}
 */
export function computed (compute) {
	return new Computed(compute);
}

export function effect (compute) {
	// Return a bound function instead of a wrapper like `() => effect._dispose()`,
	// because bound functions seem to be just as fast and take up a lot less memory.
	let effect = new Effect(compute);
	let dispose = effect._dispose.bind(effect);

	try {
		effect._run();
	}
	catch (error) {
		dispose();
		throw error;
	}

	if (curr_scope && effect._sources) {
		effect._depth = curr_scope._depth;
		curr_scope.cleanups.push(dispose);
	}

	return dispose;
}
