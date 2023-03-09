import { is_function } from './utils.js';

let undefined;

let RUNNING = 1 << 0;
let NOTIFIED = 1 << 1;
let OUTDATED = 1 << 2;
let DISPOSED = 1 << 3;
let HAS_ERROR = 1 << 4;
let TRACKING = 1 << 5;

/** @type {Scope | undefined} */
export let eval_scope;

/** @type {Computed | Effect | undefined} */
let eval_context;
/** @type {Array<Signal> | undefined} */
let eval_sources;
/** @type {number} */
let eval_sources_idx = 0;

/** @type {Effect[] | undefined} */
let batched_effects;
/** current batch depth */
let batch_depth = 0;
/** how many times we've been iterating through batched updates */
let batch_iteration = 0;

// How "versioning" works here is based around the idea of a logical clock,
// we can check if a target is stale by comparing its last recorded value of
// the clock against a source's last recorded value of the clock.
let clock = 0;

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

	while (batched_effects) {
		let effects = batched_effects.sort((a, b) => a._depth - b._depth);
		let idx = 0;
		let len = effects.length;

		batched_effects = undefined;
		batch_iteration++;

		for (; idx < len; idx++) {
			let effect = effects[idx];
			effect._flags &= ~NOTIFIED;

			if (!(effect._flags & DISPOSED) && need_recompute(effect)) {
				try {
					effect._callback();
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
 * @returns {boolean}
 */
function need_recompute (target) {
	let sources = target._sources;
	let len = sources.length;
	let idx = 0;
	let source;

	for (; idx < len; idx++) {
		source = sources[idx];

		if (source._epoch > target._epoch || source._refresh()) {
			return true;
		}
	}

	// If none of the dependencies have changed values since last recompute then
	// there's no need to recompute.
	return false;
}

function cleanup_context () {
	let sources = eval_context._sources;

	if (eval_sources) {
		prune_context_sources();

		if (eval_sources_idx > 0) {
			let l = eval_sources.length;
			let i = 0;

			sources.length = eval_sources_idx + l;

			for (; i < l; i++) {
				sources[eval_sources_idx + i] = eval_sources[i];
			}
		}
		else {
			sources = eval_context._sources = eval_sources;
		}

		let len = sources.length;
		let idx = eval_sources_idx;

		for (; idx < len; idx++) {
			let source = sources[idx];
			source._node = undefined;

			if (eval_context._flags & TRACKING) {
				source._subscribe(eval_context);
			}
		}
	}
	else if (eval_sources_idx < eval_context._sources.length) {
		prune_context_sources();
		sources.length = eval_sources_idx;
	}

	while (eval_sources_idx--) {
		let source = sources[eval_sources_idx];
		source._node = undefined;
	}
}

function prune_context_sources () {
	let sources = eval_context._sources;

	let len = sources.length;
	let idx = eval_sources_idx;

	for (; idx < len; idx++) {
		let source = sources[idx];
		source._unsubscribe(eval_context);
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
		let _this = this;

		/** @internal @type {T} */
		_this._value = value;
		/** @internal @type {number} */
		_this._epoch = -1;
		/** @internal @type {Array<Computed | Effect>} */
		_this._targets = [];
		/** @internal @type {Computed | Effect | undefined} */
		_this._node = undefined;
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
	 * @returns {T}
	 */
	peek () {
		let _this = this;
		return _this._value;
	}

	/** @type {T} */
	get value () {
		let _this = this;

		if (eval_context && _this._node !== eval_context) {
			// Mark the current context, there's no need to add ourselves again to the
			// dependency list if we're already in it, will be unset during cleanup
			_this._node = eval_context;

			if (!eval_sources) {
				if (eval_context._sources[eval_sources_idx] === _this) {
					eval_sources_idx++;
				}
				else {
					eval_sources = [_this];
				}
			}
			else {
				eval_sources.push(_this);
			}
		}

		return _this._value;
	}
	set value (next) {
		let _this = this;

		if (_this._value !== next) {
			_this._value = next;
			_this._epoch = ++clock;

			if (batch_iteration < 100) {
				let targets = _this._targets;
				let len = targets.length;
				let idx = 0;

				/* @__INLINE__ */ start_batch();

				try {
					for (; idx < len; idx++) {
						targets[idx]._notify();
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

		let _this = this;

		/** @internal @type {() => T} */
		_this._compute = compute;
		/** @internal @type {Array<Signal>} */
		_this._sources = [];
		/** @internal @type {number} */
		_this._flags = OUTDATED;
		/** @internal @type {number} */
		_this._world_epoch = -1;
	}

	/**
	 * @internal
	 * @returns {boolean}
	 */
	_refresh () {
		let _this = this;

		_this._flags &= ~NOTIFIED;

		if (_this._flags & RUNNING) {
			return false;
		}

		// If this computed signal has subscribed to updates from its dependencies
		// (TRACKING flag set) and none of them have notified about changes (OUTDATED
		// flag not set), then the computed value can't have changed.
		if ((_this._flags & (OUTDATED | TRACKING)) === TRACKING) {
			return false;
		}

		_this._flags &= ~OUTDATED;

		// If nothing in the world has been changed, then it's not possible for this
		// computed value to change.
		if (_this._world_epoch === clock) {
			return false;
		}

		_this._world_epoch = clock;

		// Mark this computed signal running before checking the dependencies for value
		// changes, so that the RUNNING flag can be used to notice cyclical dependencies.
		_this._flags |= RUNNING;

		if (_this._epoch > -1 && !need_recompute(_this)) {
			_this._flags &= ~RUNNING;
			return false;
		}

		let stale = false;
		let prev_context = eval_context;
		let prev_sources = eval_sources;
		let prev_sources_idx = eval_sources_idx;

		try {
			eval_context = _this;
			eval_sources = undefined;
			eval_sources_idx = 0;

			let value = _this._compute();

			if (_this._flags & HAS_ERROR || _this._value !== value || _this._epoch === -1) {
				stale = true;

				_this._value = value;
				_this._flags &= ~HAS_ERROR;
				_this._epoch = ++clock;
			}
		}
		catch (err) {
			stale = true;

			_this._value = err;
			_this._flags |= HAS_ERROR;
			_this._epoch = ++clock;
		}

		cleanup_context();

		eval_context = prev_context;
		eval_sources = prev_sources;
		eval_sources_idx = prev_sources_idx;

		_this._flags &= ~RUNNING;
		return stale;
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

			_this._flags |= TRACKING;

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

			_this._flags &= ~TRACKING;

			for (; idx < len; idx++) {
				sources[idx]._unsubscribe(_this);
			}
		}
	}

	/**
	 * @internal
	 */
	_notify () {
		let _this = this;

		if (!(_this._flags & (NOTIFIED | RUNNING))) {
			let targets = _this._targets;
			let len = targets.length;
			let idx = 0;

			_this._flags |= OUTDATED | NOTIFIED;

			for (; idx < len; idx++) {
				targets[idx]._notify();
			}
		}
	}

	peek () {
		let _this = this;

		_this._refresh();

		if (_this._flags & HAS_ERROR) {
			throw _this._value;
		}

		return _this._value;
	}

	get value () {
		let _this = this;

		_this._refresh();

		if (_this._flags & HAS_ERROR) {
			throw super.value;
		}

		return super.value;
	}
	set value (next) {
		super.value = next;
	}
}

export class Effect {
	/**
	 * @param {() => void} compute
	 */
	constructor (compute) {
		let _this = this;

		/** @internal @type {() => void} */
		_this._compute = compute;
		/** @internal @type {number} */
		_this._epoch = 0;
		/** @internal @type {Array<Signal>} */
		_this._sources = [];
		/** @internal @type {number} */
		_this._flags = TRACKING;
		/** @internal @type {number} */
		_this._depth = 0;
	}

	/**
	 * @internal
	 */
	_callback () {
		let _this = this;

		if (_this._flags & RUNNING) {
			return;
		}

		_this._epoch = clock;

		_this._flags |= RUNNING;
		_this._flags &= ~OUTDATED;

		let prev_context = eval_context;
		let prev_sources = eval_sources;
		let prev_sources_idx = eval_sources_idx;

		try {
			/* @__INLINE__ */ start_batch();

			eval_context = _this;
			eval_sources = undefined;
			eval_sources_idx = 0;

			_this._compute();
		}
		finally {
			cleanup_context();

			eval_context = prev_context;
			eval_sources = prev_sources;
			eval_sources_idx = prev_sources_idx;

			_this._flags &= ~RUNNING;

			if (_this._flags & DISPOSED) {
				dispose_effect(_this);
			}

			end_batch();
		}
	}

	/**
	 * @internal
	 */
	_notify () {
		let _this = this;

		if (!(_this._flags & (NOTIFIED | RUNNING))) {
			_this._flags |= OUTDATED | NOTIFIED;
			(batched_effects ||= []).push(_this);
		}
	}

	/**
	 * @internal
	 */
	_dispose () {
		let _this = this;

		_this._flags |= DISPOSED;

		if (!(_this._flags & RUNNING)) {
			dispose_effect(_this);
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

		if (!detached && eval_scope) {
			_this.parent = eval_scope;
			_this._depth = eval_scope._depth + 1;

			eval_scope.scopes.push(_this);
		}
	}

	/**
	 * @template {T}
	 * @param {() => T} callback
	 * @returns {T}
	 */
	run (callback) {
		let prev_scope = eval_scope;

		try {
			eval_scope = this;
			return callback();
		}
		finally {
			eval_scope = prev_scope;
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

/**
 * @param {boolean} detached
 * @returns {Scope}
 */
export function scope (detached) {
	return new Scope(detached);
}

/**
 * @param {() => void} callback
 * @returns {void}
 */
export function cleanup (callback) {
	if (is_function(callback) && eval_scope) {
		eval_scope.cleanups.push(callback);
	}
}

/**
 * @param {() => void} callback
 * @returns {void}
 */
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

/**
 * @template T
 * @param {() => T} callback
 * @returns {T}
 */
export function untrack (callback) {
	let prev_context = eval_context;

	try {
		eval_context = undefined;
		return callback();
	}
	finally {
		eval_context = prev_context;
	}
}

/**
 * @template T
 * @param {T | Signal<T>} value
 * @returns {T}
 */
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

/**
 * @param {() => void} compute
 * @returns {() => void} dispose function
 */
export function effect (compute) {
	// Return a bound function instead of a wrapper like `() => effect._dispose()`,
	// because bound functions seem to be just as fast and take up a lot less memory.
	let effect = new Effect(compute);
	let dispose = effect._dispose.bind(effect);

	try {
		effect._callback();
	}
	catch (error) {
		dispose();
		throw error;
	}

	if (eval_scope && effect._sources.length > 0) {
		effect._depth = eval_scope._depth;
		eval_scope.cleanups.push(dispose);
	}

	return dispose;
}
