// Stripped out version of @vue/reactivity, not intended for public usage.
import { is, is_function } from './utils.js';
import { Set } from './globals.js';


let curr_track_bit = 1;
let curr_track_depth = 0;

/** @type {?Scope} */
export let curr_scope = null;
/** @type {?Effect} */
export let curr_effect = null;
/** @type {Set<Effect>} */
let active_effects = new Set();

let max_track_bits = 30;


export function scope (detached) {
	return new Scope(detached);
}

export function effect (fn, scheduler) {
	let instance = new Effect(fn, scheduler != null ? scheduler : schedule_effect);

	if (!scheduler) {
		instance._run();
	}

	return instance;
}

/** @type {Effect[]} */
let pending_effects = [];
let flushing = false;
let dirty = false;

/** @param {Effect} effect */
export function schedule_effect (effect) {
	if (!effect._dirty) {
		if (!flushing) {
			flushing = true;
			setTimeout(flush_effects);
		}

		effect._dirty = dirty = true;
		pending_effects.push(effect);
	}
}

function flush_effects () {
	let idx = 0;
	let len = 0;

	while (dirty) {
		dirty = false;
		len = pending_effects.length;

		for (; idx < len; idx++) {
			let effect = pending_effects[idx];

			effect._dirty = false;
			effect._run();
		}
	}

	pending_effects.length = 0;
	flushing = false;
}


export function cleanup (fn) {
	if (is_function(fn)) {
		curr_scope._cleanups.push(fn);
	}
}

export function ref (value) {
	let instance = new Ref(value);

	return instance;
}

export function computed (getter) {
	let instance = new Computed(getter);

	return instance;
}

export class Scope {
	/** @type {?true} disabled */
	_disabled = false;

	/** @type {?Scope} parent scope */
	_parent;
	/** @type {?number} index on parent scope */
	_parent_idx;

	/** @type {Effect[]} child effects */
	_effects = [];
	/** @type {(() => void)[]} child cleanups */
	_cleanups = [];
	/** @type {Scope[]} child scopes */
	_scopes = [];

	constructor (detached) {
		let _this = this;

		if (!detached && curr_scope) {
			_this._parent = curr_scope;
			_this._parent_idx = curr_scope._scopes.push(_this) - 1;
		}
	}

	_run (fn) {
		if (this._disabled) {
			return;
		}

		let prev_scope = curr_scope;

		try {
			curr_scope = this;
			return fn();
		}
		finally {
			curr_scope = prev_scope;
		}
	}

	_clear () {
		let _this = this;

		let effects = _this._effects;
		let cleanups = _this._cleanups;
		let scopes = _this._scopes;

		for (let effect of effects) {
			effect._stop();
		}

		for (let cleanup of cleanups) {
			cleanup();
		}

		for (let scope of scopes) {
			scope._stop(true);
		}

		effects.length = 0;
		cleanups.length = 0;
		scopes.length = 0;
	}

	_stop (from_parent) {
		let _this = this;
		let parent = !from_parent && _this._parent;

		_this._disabled = true;
		_this._clear();

		if (parent) {
			let last = parent._scopes.pop();
			let idx = _this._parent_idx;

			if (last && last !== _this) {
				parent._scopes[idx] = last;
				last._parent_idx = idx;
			}
		}
	}
}

export class Effect {
	/** disabled */
	_disabled = false;

	/** ref dependencies */
	_dependencies = [];
	/** fn */
	_fn;
	/** scheduler */
	_scheduler;
	/** dirty */
	_dirty = false;

	constructor (fn, scheduler) {
		let _this = this;

		_this._fn = fn;
		_this._scheduler = scheduler;

		curr_scope?._effects.push(_this);
	}

	_run () {
		let _this = this;
		let prev_effect = curr_effect;

		let deps = _this._dependencies;

		if (_this._disabled || active_effects.has(_this)) {
			return;
		}

		try {
			curr_effect = _this;
			active_effects.add(_this);

			curr_track_bit = 1 << ++curr_track_depth;

			if (curr_track_depth <= max_track_bits) {
				for (let i = 0, l = deps.length; i < l; i++) {
					deps[i].w |= curr_track_bit;
				}
			}
			else {
				_this._stop();
			}

			return _this._fn();
		}
		finally {
			if (curr_track_depth <= max_track_bits) {
				let pointer = 0;

				for (let i = 0, l = deps.length; i < l; i++) {
					let dep = deps[i];

					if (was_tracked(dep) && !new_tracked(dep)) {
						dep.delete(_this);
					}
					else {
						deps[pointer++] = dep;
					}

					dep.w &= ~curr_track_bit;
					dep.n &= ~curr_track_bit;
				}

				deps.length = pointer;
			}

			curr_track_bit = 1 << --curr_track_depth;
			curr_effect = prev_effect;
			active_effects.delete(_this);
		}
	}

	_stop () {
		let _this = this;
		let deps = _this._dependencies;

		_this._disabled = true;

		for (let i = 0, l = deps.length; i < l; i++) {
			deps[i].delete(_this);
		}

		deps.length = 0;
	}
}

export class Ref {
	/** effect dependencies */
	_dependencies = create_dep();
	/** current value */
	_value;

	constructor (value) {
		this._value = value;
	}

	get v () {
		let _this = this;

		track_effect(_this._dependencies);
		return _this._value;
	}

	set v (next) {
		let _this = this;

		if (!is(_this._value, next)) {
			_this._value = next;
			trigger_effect(_this._dependencies);
		}
	}
}

export class Computed {
	/** effect dependencies */
	_dependencies = create_dep();
	/** dirty */
	_dirty = true;
	/** current value */
	_value;
	/** @type {Effect} effect */
	_effect;

	constructor (getter) {
		let _this = this;

		_this._effect = effect(getter, () => {
			if (!_this._dirty) {
				_this._dirty = true;
				trigger_effect(_this._dependencies);
			}
		});
	}

	get v () {
		let _this = this;

		if (_this._dirty) {
			_this._value = _this._effect._run();
			_this._dirty = false;
		}

		track_effect(_this._dependencies);
		return _this._value;
	}

	set v (next) {
		let _this = this;

		if (!is(_this._value, next)) {
			_this._dirty = false;
			_this._value = next;
			trigger_effect(_this._dependencies);
		}
	}
}

/**
 * @param {RefDependencies} dep
 */
function track_effect (dep) {
	if (!curr_effect) {
		return;
	}

	let should_track = false;

	if (curr_track_depth <= max_track_bits) {
		if (!new_tracked(dep)) {
			dep.n |= curr_track_bit;
			should_track = !was_tracked(dep);
		}
	}
	else {
		should_track = !dep.has(curr_effect);
	}

	if (should_track) {
		dep.add(curr_effect);
		curr_effect._dependencies.push(dep);
	}
}

/**
 * @param {RefDependencies} dep
 */
function trigger_effect (dep) {
	for (let effect of dep) {
		if (effect._scheduler) {
			effect._scheduler(effect);
		}
		else {
			effect._run();
		}
	}
}


function create_dep () {
	/** @type {RefDependencies} */
	let dep = new Set();
	dep.w = 0;
	dep.n = 0;

	return dep;
}

/**
 * @param {RefDependencies} dep
 * @returns {boolean}
 */
function was_tracked (dep) {
	return (dep.w & curr_track_bit) > 0;
}

/**
 * @param {RefDependencies} dep
 * @returns {boolean}
 */
function new_tracked (dep) {
	return (dep.n & curr_track_bit) > 0;
}

/**
 * @typedef {Set<Effect> & { w: number, n: number }} RefDependencies
 */
