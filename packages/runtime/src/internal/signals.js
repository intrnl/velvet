// Based off @preact/signals-core, with modifications:
// - Silently ignore cycle detection instead of throwing
// - Allow overriding values of computed signals
// - Addition of scopes for orchestrating effects
// - Effect depth tracking,
// - Not using TypeScript, only JSDoc typings.
// - Using ES6 classes.

// Based off commit 1441d5f1563ada3537e13fa9ac2878f565606389

import { is_function } from './utils.js';

/**
 * @typedef {object} Node
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

/** @type {Scope | undefined} */
export let eval_scope;

/** @type {Effect | Computed | undefined} Currently evaluating computed or effect */
let eval_context;
/** @type {Effect[] | undefined} Effects collected into a batch, to be sorted in order */
let batched_effects;
/** @type {number} Current depth of batching */
let batch_depth = 0;
/** @type {number} Iteration count for potential cycle runaway */
let batch_iteration = 0;

/** @type {number} Global version number to quickly check if something needs recomputing */
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
		batched_effects = undefined;

		batch_iteration++;

		for (let i = 0, l = effects.length; i < l; i++) {
			let effect = effects[i];
			effect._flags &= ~NOTIFIED;

			if (!(effect._flags & DISPOSED) && should_recompute(effect)) {
				try {
					effect._callback();
				}
				catch (err) {
					if (!has_error) {
						has_error = true;
						error = err;
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
		return;
	}

	let node = signal._node;
	if (!node || node._target !== eval_context) {
		// `signal` is a new dependency. Create a new node dependency node, move it
		//  to the front of the current context's dependency list.
		node = {
			_version: 0,
			_rollback: node,

			_source: signal,
			_prev_source: undefined,
			_next_source: eval_context._sources,

			_target: eval_context,
			_prev_target: undefined,
			_next_target: undefined,
		};

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

		// If `node` is not already the current head of the dependency list (i.e.
		// there is a previous node in the list), then make `node` the new head.
		if (node._prev_source) {
			node._prev_source._next_source = node._next_source;

			if (node._next_source) {
				node._next_source._prev_source = node._prev_source;
			}

			node._prev_source = undefined;
			node._next_source = eval_context._sources;

			// evalCotext._sources must be !== undefined (and !== node), because
			// `node` was originally pointing to some previous node.
			eval_context._sources._prev_source = node;
			eval_context._sources = node;
		}

		// We can assume that the currently evaluated effect / computed signal is already
		// subscribed to change notifications from `signal` if needed.
		return node;
	}
}

/**
 * @param {Computed | Effect} target
 * @returns {boolean}
 */
function should_recompute (target) {
	// Check the dependencies for changed values. The dependency list is already
	// in order of use. Therefore if multiple dependencies have changed values, only
	// the first used dependency is re-evaluated at this point.
	for (let node = target._sources; node; node = node._next_source) {
		// If there's a new version of the dependency before or after refreshing,
		// or the dependency has something blocking it from refreshing at all (e.g. a
		// dependency cycle), then we need to recompute.
		if (
			node._source._version !== node._version ||
			!node._source._refresh() ||
			node._source._version !== node._version
		) {
			return true;
		}
	}

		// If none of the dependencies have changed values since last recompute then the
	// there's no need to recompute.
	return false;
}

/**
 * @param {Computed | Effect} target
 */
function prepare_sources (target) {
	for (let node = target._sources; node; node = node._next_source) {
		let rollback = node._source._node;

		if (!rollback) {
			node._rollback = rollback;
		}

		node._source._node = node;
		node._version = -1;
	}
}

/**
 * @param {Computed | Effect} target
 */
function cleanup_sources (target) {
	// At this point target._sources is a mishmash of current & former dependencies.
	// The current dependencies are also in a reverse order of use.
	// Therefore build a new, reverted list of dependencies containing only the current
	// dependencies in a proper order of use.
	// Drop former dependencies from the list and unsubscribe from their change notifications.

	/** @type {Node | undefined} */
	let sources;
	let node = target._sources;

	while (node) {
		let next = node._next_source;

		if (node._version === -1) {
			node._source._unsubscribe(node);
			node._next_source = undefined;
		}
		else {
			if (sources) {
				sources._prev_source = node;
			}

			node._prev_source = undefined;
			node._next_source = sources;
			sources = node;
		}

		node._source._node = node._rollback;
		if (node._rollback) {
			node._rollback = undefined;
		}

		node = next;
	}

	target._sources = sources;
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
 * @param {Effect | Computed | undefined} prev_context
 */
function end_effect (prev_context) {
	let effect = this;

	if (eval_context !== effect) {
		return;
	}

	cleanup_sources(effect);
	eval_context = prev_context;

	effect._flags &= ~RUNNING;
	if (effect._flags & DISPOSED) {
		dispose_effect(effect);
	}

	end_batch();
}

/** @template T */
export class Signal {
	/**
	 * @param {T} value
	 */
	constructor (value) {
		let _this = this;

		/** @internal @type {T} */
		_this._value = value;
		/** @internal @type {number} */
		_this._version = 0;
		/** @internal @type {Node | undefined} */
		_this._node = undefined;
		/** @internal @type {Node | undefined} */
		_this._targets = undefined;
	}

	_refresh () {
		return true;
	}

	/**
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
	 * @param {Node} node
	 */
	_unsubscribe (node) {
		let _this = this;

		let prev = node._prev_target;
		let next = node._next_target;

		if (prev) {
			prev._next_target = next;
			node._prev_target = undefined;
		}

		if (next) {
			next._prev_source = prev;
			node._next_target = undefined;
		}

		if (node === _this._targets) {
			_this._targets = next;
		}
	}

	/**
	 * @param {() => T} fn
	 */
	subscribe (fn) {
		let signal = this;

		return effect(function () {
			/** @type {Effect} */
			let instance = this;

			let value = signal.value;
			let flag = instance._flags & TRACKING;
			instance._flags &= ~TRACKING;

			try {
				fn(value);
			}
			finally {
				instance._flags |= flag;
			}
		});
	}

	/**
	 * @param {T} next
	 */
	set (next) {
		return this.value = next;
	}

	peek () {
		let _this = this;
		return _this._value;
	}

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

			if (batch_iteration > 100) {
				return;
			}

			start_batch();

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

/** @template T */
export class Computed extends Signal {
	/**
	 * @param {() => T} compute
	 */
	constructor (compute) {
		super(undefined);

		let _this = this;

		/** @internal @type {() => T} */
		_this._compute = compute;
		/** @internal @type {Node | undefined} */
		_this._sources = undefined;
		/** @internal @type {number} */
		_this._global_version = global_version - 1;
		/** @internal @type {number} */
		_this._flags = OUTDATED;
	}

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

		_this._global_version = global_version;
		_this._flags |= RUNNING;

		if (_this._version > 0 && !should_recompute(_this)) {
			_this._flags &= ~RUNNING;
			return true;
		}

		let prev_context = eval_context;
		try {
			prepare_sources(_this);
			eval_context = _this;

			let value = _this._compute();

			if (_this._flags & HAS_ERROR || _this._value !== value || _this._version === 0) {
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
	 * @param {Node} node
	 */
	_unsubscribe (node) {
		let _this = this;

		super._unsubscribe(node);

			// Computed signal unsubscribes from its dependencies from it loses its last subscriber.
		if (!_this._targets) {
			_this._flags &= ~TRACKING;

			for (let node = _this._sources; node; node = node._next_source) {
				node._source._unsubscribe(node);
			}
		}
	}

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

		if (!(_this._flags & RUNNING)) {
			let node = add_dependency(_this);
			_this._refresh();

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
		let _this = this;

		/** @internal @type {() => void} */
		_this._compute = compute;
		/** @internal @type {Node | undefined} */
		_this._sources = undefined;
		/** @internal @type {number} */
		_this._flags = TRACKING;
		/** @internal @type {number} */
		_this._depth = -1;
	}

	_callback () {
		let _this = this;

		if (_this._flags & RUNNING) {
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

	_start () {
		let _this = this;

		_this._flags |= RUNNING;
		_this._flags &= ~DISPOSED;

		prepare_sources(_this);
		start_batch();

		let prev_context = eval_context;
		eval_context = _this;

		return end_effect.bind(_this, prev_context);
	}

	_notify () {
		let _this = this;

		if (!(_this._flags & (NOTIFIED | RUNNING))) {
			_this._flags |= NOTIFIED;

			if (!batched_effects) {
				batched_effects = [];
			}

			batched_effects.push(_this);
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
		/** @type {number} */
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

	start_batch();

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

export function signal (value) {
	return new Signal(value);
}

export function computed (compute) {
	return new Computed(compute);
}

export function effect (compute) {
	let effect = new Effect(compute);
	let dispose = effect._dispose.bind(effect);

	try {
		effect._callback();
	}
	catch (error) {
		dispose();
		throw error;
	}

	if (eval_scope) {
		effect._depth = eval_scope._depth;
		eval_scope.cleanups.push(dispose);
	}

	return dispose;
}
