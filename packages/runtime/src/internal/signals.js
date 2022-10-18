// Code taken mostly as-is from @preact/signals-core, with modifications:
// - Silently ignore cycles, it should not throw.
// - Add .set(value) method for use with stores.
// - Allow overriding values to computed signals.
// - Addition of scopes for managing effects.
// - Effect depth tracking
// - Not using TypeScript, only JSDoc typings.

// Based off commit 4a6288a9a974cb8a2104d51639796bf1556ecb40

import { is_function } from './utils.js';

/**
 * @typedef {object} Node
 * @property {number} _version
 * @property {number} _flags
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
let STALE = 1 << 1;
let NOTIFIED = 1 << 2;
let HAS_ERROR = 1 << 3;
let SHOULD_SUBSCRIBE = 1 << 4;
let SUBSCRIBED = 1 << 5;

/** @type {Scope | undefined} Currently evaluated scope */
export let eval_scope;

/** @type {Effect | Computed | undefined} Currently evaluted effect or computed */
let eval_context;

/** @type {Effect[] | undefined} Effects collected into a batch */
let batched_effects;
/** Current depth of batching */
let batch_depth = 0;
/** How many times we've been iterating through batched updates */
let batch_iteration = 0;

/** Signal global version number as an optimization */
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

	batch_iteration = 0;
	batch_depth--;

	if (has_error) {
		throw error;
	}
}

function get_value (signal) {
	/** @type {Node | undefined} */
	let node;

	if (eval_context) {
		node = signal._node;

		if (!node || node._target !== eval_context) {
			// `signal` is a new dependency. Create a new node dependency node, move it
			//  to the front of the current context's dependency list.
			node = {
				_version: 0,
				_flags: 0,
				_rollback: undefined,

				_source: signal,
				_next_source: eval_context._sources,
				_prev_source: undefined,

				_target: eval_context,
				_next_target: undefined,
				_prev_target: undefined,
			};

			eval_context._sources = node;
			signal._node = node;

			// Subscribe to change notifications from this dependency if we're in an effect
			// OR evaluating a computed signal that in turn has subscribers.
			if (eval_context._flags & SHOULD_SUBSCRIBE) {
				signal._subscribe(node);
			}
		}
		else if (node._flags & STALE) {
			// `signal` is an existing dependency from a previous evaluation. Reuse the dependency
			// node and move it to the front of the evaluation context's dependency list.
			node._flags &= ~STALE;

			let head = eval_context._sources;
			let prev = node._prev_source;
			let next = node._next_source;

			if (node !== head) {
				if (prev) {
					prev._next_source = next;
				}
				if (next) {
					next._prev_source = prev;
				}
				if (head) {
					head._prev_source = node;
				}

				node._prev_source = undefined;
				node._next_source = head;

				eval_context._sources = node;
			}

			// We can assume that the currently evaluated effect / computed signal is already
			// subscribed to change notifications from `signal` if needed.
		}
		else {
			// `signal` is an existing dependency from current evaluation.
			node = undefined;
		}
	}

	try {
		return signal.peek();
	}
	finally {
		if (node) {
			node._version = signal._version;
		}
	}
}

function get_computed (computed) {
	computed._flags &= ~RUNNING;

	if (computed._flags & HAS_ERROR) {
		throw computed._value;
	}

	return computed._value;
}

function prepare_sources (target) {
	for (let node = target._sources; node; node = node._next_source) {
		let rollback = node._source._node;

		if (rollback) {
			node._rollback = rollback;
		}

		node._source._node = node;
		node._flags |= STALE;
	}
}

function cleanup_sources (target) {
	// At this point target._sources is a mishmash of current & former dependencies.
	// The current dependencies are also in a reverse order of use.
	// Therefore build a new, reverted list of dependencies containing only the current
	// dependencies in a proper order of use.
	// Drop former dependencies from the list and unsubscribe from their change notifications.

	/** @type {Node | undefined} */
	let node = target._sources;
	/** @type {Node | undefined} */
	let sources;

	while (node) {
		let next = node._next_source;

		if (node._flags & STALE) {
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

function end_effect (prev_context) {
	let _this = this;

	cleanup_sources(_this);
	eval_context = prev_context;

	end_batch();
	_this._flags &= ~RUNNING;
}

/** @template T */
export class Signal {
	/**
	 * @param {T} value
	 */
	constructor (value) {
		let _this = this;

		/** @internal @type {number} */
		_this._version = 0;
		/** @internal @type {T} */
		_this._value = value;
		/** @internal @type {Node | undefined} */
		_this._node = undefined;
		/** @internal @type {Node | undefined} */
		_this._targets = undefined;
	}

	/**
	 * @internal
	 * @param {Node} node
	 */
	_subscribe (node) {
		let _this = this;

		if (!(node._flags & SUBSCRIBED)) {
			node._flags |= SUBSCRIBED;
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
		let prev = node._prev_target;
		let next = node._next_target;

		if (node._flags & SUBSCRIBED) {
			node._flags &= ~SUBSCRIBED;

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
	 * @returns {() => void}
	 */
	subscribe (fn) {
		let signal = this;

		return effect(function () {
			let value = signal.value;
			let prev_context = eval_context;
			eval_context = undefined;

			try {
				return fn(value);
			} finally {
				eval_context = prev_context;
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
		return this._value;
	}

	/** @type {T} */
	get value () {
		return get_value(this);
	}
	set value(value) {
		let _this = this;

		if (value !== _this._value) {
			_this._value = value;

			if (batch_iteration > 100) {
				return;
			}

			_this._version++;
			global_version++;
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

		/** @internal @type {() => T} */
		this._compute = compute;
		/** @internal @type {Node | undefined} */
		this._sources = undefined;
		/** @internal @type {number} */
		this._flags = STALE;
		/** @internal @type {number} */
		this._global_version = global_version - 1;
	}

	/**
	 * @internal
	 * @param {Node} node
	 */
	_subscribe (node) {
		let _this = this;

		if (!_this._targets) {
			_this._flags |= STALE | SHOULD_SUBSCRIBE;

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

		super._unsubscribe(node);

		// Computed signal unsubscribes from its dependencies from it loses its last subscriber.
		if (!_this._targets) {
			_this._flags &= ~SHOULD_SUBSCRIBE;

			for (let node = _this._sources; node; node = node._next_source) {
				node._source._unsubscribe(node);
			}
		}
	}

	_notify () {
		let _this = this;

		if (!(_this._flags & (NOTIFIED | RUNNING))) {
			_this._flags |= STALE | NOTIFIED;

			for (let node = _this._targets; node; node = node._next_target) {
				node._target._notify();
			}
		}
	}

	/**
	 * @returns {T}
	 */
	peek () {
		let _this = this;

		_this._flags &= ~NOTIFIED;

		if (_this._flags & RUNNING) {
			return _this._value;
		}

		_this._flags |= RUNNING;

		if ((!(_this._flags & STALE) && _this._targets) || _this._global_version === global_version) {
			return get_computed(_this);
		}

		_this._flags &= ~STALE;
		_this._global_version = global_version;

		if (_this._version > 0) {
			// Check current dependencies for changes. The dependency list is already in
			// order of use. Therefore if >1 dependencies have changed only the first used one
			// is re-evaluated at this point.
			let node = _this._sources;

			while (node) {
				if (node._source._version !== node._version) {
					break;
				}

				try {
					node._source.peek();
				}
				catch {
					// Failures of current dependencies shouldn't be rethrown here in case the
					// compute function catches them.
				}

				if (node._source._version !== node._version) {
					break;
				}

				node = node._next_source;
			}

			if (!node) {
				return get_computed(_this);
			}
		}

		let prev_value = _this._value;
		let prev_flags = _this._flags;
		let prev_context = eval_context;

		try {
			eval_context = _this;
			prepare_sources(_this);

			_this._value = _this._compute();
			_this._flags &= ~HAS_ERROR;

			if (prev_flags & HAS_ERROR || _this._value !== prev_value || _this._version === 0) {
				_this._version++;
			}
		}
		catch (err) {
			_this._value = err;
			_this._flags |= HAS_ERROR;
			_this._version++;
		}
		finally {
			cleanup_sources(_this);
			eval_context = prev_context;
		}

		return get_computed(_this);
	}

	/** @type {T} */
	get value () {
		let _this = this;

		if (_this._flags & RUNNING) {
			return _this._value;
		}

		return get_value(_this);
	}
	set value(next) {
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
		this._depth = 0;
		/** @internal @type {number} */
		this._flags = SHOULD_SUBSCRIBE;
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

		let prev_context = eval_context;
		_this._flags |= RUNNING;

		start_batch();
		eval_context = _this;

		prepare_sources(_this);
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

		for (let node = _this._sources; node; node = node._next_source) {
			node._source._unsubscribe(node);
		}

		// running perpetually, doing nothing.
		_this._flags |= RUNNING;
		_this._sources = undefined;
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

	if (eval_scope) {
		effect._depth = eval_scope._depth;
		eval_scope.cleanups.push(dispose);
	}

	return dispose;
}
