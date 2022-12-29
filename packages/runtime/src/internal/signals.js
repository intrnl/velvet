// Code taken mostly as-is from @preact/signals-core, with modifications:
// - Silently ignore cycles, it should not throw.
// - Add .set(value) method for use with stores.
// - Allow overriding values to computed signals.
// - Addition of scopes for managing effects.
// - Effect depth tracking
// - Not using TypeScript, only JSDoc typings.

// Based off commit 9d3ffd9a1f2f2ef94247b5857a42a85df5066a08

import { is_function } from './utils.js';

/**
 * @typedef {object} Node
 *
 * @property {number} _version
 * @property {Node | undefined} _rollback
 *
 * @property {Signal} _source
 * @property {Node | undefined} _prev_source
 * @property {Node | undefined} _next_source
 *
 * @property {Computed | Effect} _target
 * @property {Node | undefined} _prev_target
 * @property {Node | undefined} _next_target
 */

let undefined;

let RUNNING = 1 << 0;
let NOTIFIED = 1 << 1;
let OUTDATED = 1 << 2;
let DISPOSED = 1 << 3;
let HAS_ERROR = 1 << 4;
let TRACKING = 1 << 5;

/** @type {Scope | undefined} Currently evaluated scope */
export let eval_scope;
/** @type {Computed | Effect | undefined} */
let eval_context;

/** @type {Effect[] | undefined} */
let batched_effects;
/** current batch depth */
let batch_depth = 0;
/** how many times we've been iterating through batched updates */
let batch_iteration = 0;

/** fast-path for computed values */
let global_version = 0;

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
 * @param {Signal} signal
 * @returns {Node | undefined}
 */
function add_dependency (signal) {
	if (!eval_context) {
		return undefined;
	}

	let node = signal._node;
	if (!node || node._target !== eval_context) {
		// `signal` is a new dependency. Create a new dependency node, and set it
		// as the tail of the current context's dependency list. e.g:
		//
		// { A <-> B       }
		//         ↑     ↑
		//        tail  node (new)
		//               ↓
		// { A <-> B <-> C }
		//               ↑
		//              tail (evalContext._sources)
		node = {
			_version: 0,
			_rollback: node,

			_source: signal,
			_prev_source: eval_context._sources,
			_next_source: undefined,

			_target: eval_context,
			_prev_target: undefined,
			_next_target: undefined,
		};

		if (eval_context._sources) {
			eval_context._sources._next_source = node;
		}

		eval_context._sources = node;
		signal._node = node;

		// Subscribe to change notifications from this dependency if we're in an effect
		// OR evaluating a computed signal that in turn has subscribers.
		if (eval_context._flags & TRACKING) {
			signal._subscribe(node);
		}

		return node;
	}
	else if (node._version === -1) {
		// `signal` is an existing dependency from a previous evaluation. Reuse it.
		node._version = 0;

		// If `node` is not already the current tail of the dependency list (i.e.
		// there is a next node in the list), then make the `node` the new tail. e.g:
		//
		// { A <-> B <-> C <-> D }
		//         ↑           ↑
		//        node   ┌─── tail (evalContext._sources)
		//         └─────│─────┐
		//               ↓     ↓
		// { A <-> C <-> D <-> B }
		//                     ↑
		//                    tail (evalContext._sources)
		if (node._next_source) {
			node._next_source._prev_source = node._prev_source;

			if (node._prev_source) {
				node._prev_source._next_source = node._next_source;
			}

			node._prev_source = eval_context._sources;
			node._next_source = undefined;

			eval_context._sources._next_source = node;
			eval_context._sources = node;
		}

		// We can assume that the currently evaluated effect / computed signal is already
		// subscribed to change notifications from `signal` if needed.
		return node;
	}

	return undefined;
}

/**
 * @param {Computed | Effect} target
 * @returns {boolean}
 */
function need_recompute (target) {
	// Check the dependencies for changed values. The dependency list is already
	// in order of use. Therefore if multiple dependencies have changed values, only
	// the first used dependency is re-evaluated at this point.
	for (let node = target._sources; node; node = node._next_source) {
		// If there's a new version of the dependency before or after refreshing,
		// or the dependency has something blocking it from refreshing at all (e.g. a
		// dependency cycle), then we need to recompute.
		if (node._source._version !== node._version || !node._source._refresh() || node._source._version !== node._version) {
			return true;
		}
	}

	// If none of the dependencies have changed values since last recompute then
	// there's no need to recompute.
	return false;
}

/**
 * @param {Computed | Effect} target
 */
function prepare_sources (target) {
	// 1. Mark all current sources as re-usable nodes (version: -1)
	// 2. Set a rollback node if the current node is being used in a different context
	// 3. Point 'target._sources' to the tail of the doubly-linked list, e.g:
	//
	//    { undefined <- A <-> B <-> C -> undefined }
	//                   ↑           ↑
	//                   │           └──────┐
	// target._sources = A; (node is head)  │
	//                   ↓                  │
	// target._sources = C; (node is tail) ─┘

	for (let node = target._sources; node; node = node._next_source) {
		let rollback = node._source._node;

		if (rollback) {
			node._rollback = rollback;
		}

		node._source._node = node;
		node._version = -1;

		if (!node._next_source) {
			target._sources = node;
			break;
		}
	}
}

/**
 * @param {Computed | Effect} target
 */
function cleanup_sources (target) {
	let node = target._sources;
	let head = undefined;

	// At this point 'target._sources' points to the tail of the doubly-linked list.
	// It contains all existing sources + new sources in order of use.
	// Iterate backwards until we find the head node while dropping old dependencies.
	while (node) {
		let prev = node._prev_source;

		// The node was not re-used, unsubscribe from its change notifications and remove itself
		// from the doubly-linked list. e.g:
		//
		// { A <-> B <-> C }
		//         ↓
		//    { A <-> C }
		if (node._version === -1) {
			node._source._unsubscribe(node);

			if (prev) {
				prev._next_source = node._next_source;
			}
			if (node._next_source) {
				node._next_source._prev_source = prev;
			}
		} else {
			// The new head is the last node seen which wasn't removed/unsubscribed
			// from the doubly-linked list. e.g:
			//
			// { A <-> B <-> C }
			//   ↑     ↑     ↑
			//   │     │     └ head = node
			//   │     └ head = node
			//   └ head = node
			head = node;
		}

		node._source._node = node._rollback;

		if (node._rollback) {
			node._rollback = undefined;
		}

		node = prev;
	}

	target._sources = head;
}

/**
 * @param {Effect} effect
 */
function dispose_effect (effect) {
	for (let node = effect._sources; node; node = node._next_source) {
		node._source._unsubscribe(node);
	}

	effect._sources = undefined;
}

/**
 * @this {Effect}
 * @param {Computed | Effect | undefined} prev_context
 */
function end_effect (prev_context) {
	let _this = this;

	cleanup_sources(_this);
	eval_context = prev_context;

	_this._flags &= ~RUNNING;

	if (_this._flags & DISPOSED) {
		dispose_effect(_this);
	}

	end_batch();
}

/** @template T */
export class Signal {
	/**
	 * @param {T} value
	 */
	constructor (value) {
		/** @internal @type {T} */
		this._value = value;
		/** @internal @type {number} */
		this._version = 0;
		/** @internal @type {Node | undefined} */
		this._node = undefined;
		/** @internal @type {Node | undefined} */
		this._targets = undefined;
	}

	/**
	 * @internal
	 * @returns {boolean}
	 */
	_refresh () {
		return true;
	}

	/**
	 * @internal
	 * @param {Node} node
	 */
	_subscribe (node) {
		let _this = this;

		if (_this._targets !== node && !node._prev_target) {
			node._next_target = _this._targets;

			if (_this._targets) {
				_this._targets._prev_target = node;
			}

			_this._targets = node;
		}
	}

	/**
	 * @internal
	 * @param {Node} node
	 */
	_unsubscribe (node) {
		let _this = this;

		if (_this._targets) {
			let prev = node._prev_target;
			let next = node._next_target;

			if (prev) {
				prev._next_target = next;
				node._prev_target = undefined;
			}

			if (next) {
				next._prev_target = prev;
				node._next_target = undefined;
			}

			if (node === _this._targets) {
				_this._targets = next;
			}
		}
	}

	/**
	 * @param {(value: T) => void} fn
	 */
	subscribe (fn) {
		let _this = this;

		return effect(() => {
			let curr_context = eval_context;
			let value = _this.value;

			try {
				eval_context = undefined;
				fn(value);
			}
			finally {
				eval_context = curr_context;
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
		let node = add_dependency(_this);

		if (node) {
			node._version = _this._version;
		}

		return _this._value;
	}
	set value (next) {
		let _this = this;

		if (_this._value !== next) {
			_this._value = next;
			_this._version++;
			global_version++;

			if (batch_iteration < 100) {
				/* @__INLINE__ */ start_batch();

				try {
					for (let node = _this._targets; node; node = node._next_target) {
						node._target._notify();
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
		/** @internal @type {Node | undefined} */
		this._sources = undefined;
		/** @internal @type {number} */
		this._global_version = global_version - 1;
		/** @internal @type {number} */
		this._flags = OUTDATED;
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
			return true;
		}

		_this._flags &= ~OUTDATED;

		if (_this._global_version === global_version) {
			return true;
		}

		// Mark this computed signal running before checking the dependencies for value
		// changes, so that the RUNNING flag can be used to notice cyclical dependencies.
		_this._flags |= RUNNING;
		_this._global_version = global_version;

		if (_this._version > 0 && !need_recompute(_this)) {
			_this._flags &= ~RUNNING;
			return true;
		}

		let prev_context = eval_context;

		try {
			prepare_sources(_this);
			eval_context = _this;

			let value = _this._compute();

			if (_this._flags & HAS_ERROR || _this._value !== value || _this._value === 0) {
				_this._value = value;
				_this._flags &= ~HAS_ERROR;
				_this._version++;
			}
		}
		catch (err) {
			_this._value = err;
			_this._flags |= HAS_ERROR;
			_this._version++;
		}

		eval_context = prev_context;
		cleanup_sources(_this);

		_this._flags &= ~RUNNING;
		return true;
	}

	/**
	 * @internal
	 * @param {Node} node
	 */
	_subscribe (node) {
		let _this = this;

		if (!_this._targets) {
			_this._flags |= OUTDATED | TRACKING;

			// A computed signal subscribes lazily to its dependencies when the it
			// gets its first subscriber.
			for (let node = _this._sources; node; node = node._next_source) {
				node._source._subscribe(node);
			}
		}

		super._subscribe(node);
	}

	/**
	 * @internal
	 * @param {Node} node
	 */
	_unsubscribe (node) {
		let _this = this;

		if (_this._targets) {
			super._unsubscribe(node);

			if (!_this._targets) {
				_this._flags &= ~TRACKING;

				for (let node = _this._sources; node; node = node._next_source) {
					node._source._unsubscribe(node);
				}
			}
		}
	}

	/**
	 * @internal
	 */
	_notify () {
		let _this = this;

		if (!(_this._flags & (NOTIFIED | RUNNING))) {
			_this._flags |= OUTDATED | NOTIFIED;

			for (let node = _this._targets; node; node = node._next_target) {
				node._target._notify();
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

		if (!(_this._flags & RUNNING)) {
			let node = add_dependency(_this);

			if (node) {
				node._version = _this._version;
			}
		}

		if (_this._flags & HAS_ERROR) {
			throw _this._value;
		}

		return _this._value;
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
		/** @internal @type {() => void} */
		this._compute = compute;
		/** @internal @type {Node | undefined} */
		this._sources = undefined;
		/** @internal @type {number} */
		this._flags = TRACKING;
		/** @internal @type {number} */
		this._depth = 0;
	}

	/**
	 * @internal
	 */
	_callback () {
		let _this = this;

		if (_this._flags & (RUNNING | DISPOSED)) {
			return;
		}

		let finish = _this._start();

		try {
			_this._compute();
		}
		finally {
			finish();
		}
	}

	/**
	 * @internal
	 * @returns {() => void}
	 */
	_start () {
		let _this = this;

		_this._flags |= RUNNING;
		_this._flags &= ~DISPOSED;

		cleanup_sources(_this);
		prepare_sources(_this);

		/* @__INLINE__ */ start_batch();

		let prev_context = eval_context;
		eval_context = _this;

		return end_effect.bind(_this, prev_context);
	}

	_notify () {
		let _this = this;

		if (!(_this._flags & (NOTIFIED | RUNNING))) {
			_this._flags |= NOTIFIED;
			(batched_effects ||= []).push(_this);
		}
	}

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

export function scope (detached) {
	return new Scope(detached);
}

export function cleanup (callback) {
	if (is_function(callback) && eval_scope) {
		eval_scope.cleanups.push(callback);
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
	let prev_context = eval_context;

	try {
		eval_context = undefined;
		return callback();
	}
	finally {
		eval_context = prev_context;
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
		effect._callback();
	}
	catch (error) {
		dispose();
		throw error;
	}

	if (eval_scope && effect._sources) {
		effect._depth = eval_scope._depth;
		eval_scope.cleanups.push(dispose);
	}

	return dispose;
}
