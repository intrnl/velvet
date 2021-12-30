// Stripped out version of @vue/reactivity, not intended for public usage.
import { is } from './utils.js';
import { Symbol, Set } from './globals.js';


export let curr_track_bit = 1;
export let curr_track_depth = 0;

export let curr_scope = null;
export let curr_effect = null;
let active_effects = new Set();

let max_track_bits = 30;
export let access = Symbol();


export function scope (detached) {
	return new Scope(detached);
}

export function effect (fn, scheduler) {
	let instance = new Effect(fn, scheduler);

	if (!scheduler) {
		instance.run();
	}

	return instance;
}

export function cleanup (fn) {
	curr_scope.c.push(fn);
}

export function ref (value) {
	let instance = new Ref(value);
	let bound = instance.run.bind(instance);

	return bound;
}

export function computed (getter) {
	let instance = new Computed(getter);
	let bound = instance.run.bind(instance);

	return bound;
}


class Scope {
	/** disabled */
	d;

	/** parent scope */
	p;
	/** index on parent scope */
	i;

	/** child effects */
	e = [];
	/** child cleanups */
	c = [];
	/** child scopes */
	s = [];

	constructor (detached) {
		let _this = this;

		if (!detached && curr_scope) {
			_this.p = curr_scope;
			_this.i = curr_scope.s.push(_this) - 1;
		}
	}

	run (fn) {
		if (this.d) {
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

	clear () {
		let _this = this;

		let effects = _this.e;
		let cleanups = _this.c;
		let scopes = _this.s;

		for (let effect of effects) {
			effect.stop();
		}

		for (let cleanup of cleanups) {
			cleanup();
		}

		for (let scope of scopes) {
			scope.stop(true);
		}

		effects.length = 0;
		cleanups.length = 0;
		scopes.length = 0;
	}

	stop (from_parent) {
		let _this = this;
		let parent = !from_parent && _this.p;

		_this.clear();

		if (parent) {
			let last = parent.s.pop();
			let idx = _this.i;

			if (last && last !== _this) {
				parent.s[idx] = last;
				last.i = idx;
			}
		}
	}
}

class Effect {
	/** ref dependencies */
	d = [];
	/** fn */
	f;
	/** scheduler */
	s;

	constructor (fn, scheduler) {
		let _this = this;

		_this.f = fn;
		_this.s = scheduler;

		curr_scope?.e.push(_this);
	}

	run () {
		let _this = this;
		let prev_effect = curr_effect;

		let deps = _this.d;

		if (active_effects.has(_this)) {
			return;
		}

		try {
			curr_effect = _this;
			active_effects.add(_this);

			curr_track_bit = 1 << ++curr_track_depth;

			if (curr_track_depth <= max_track_bits) {
				for (let i = 0; i < deps.length; i++) {
					deps[i].w |= curr_track_bit;
				}
			}
			else {
				_this.stop();
			}

			return _this.f();
		}
		finally {
			if (curr_track_depth <= max_track_bits) {
				let pointer = 0;

				for (let i = 0; i < deps.length; i++) {
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

	stop () {
		let _this = this;
		let deps = _this.d;

		for (let i = 0; i < deps.length; i++) {
			deps[i].delete(_this);
		}

		deps.length = 0;
	}
}

class Ref {
	/** effect dependencies */
	d = create_dep();
	/** current value */
	v;

	constructor (value) {
		this.v = value;
	}

	run (next, effect = true) {
		let _this = this;
		let deps = _this.d;
		let prev = _this.v;

		if (next === access) {
			if (effect) {
				track_effect(deps);
			}

			return _this.v;
		}
		else {
			_this.v = next;

			if (effect && !is(prev, next)) {
				trigger_effect(deps);
			}

			return next;
		}
	}
}

class Computed {
	/** effect dependencies */
	d = create_dep();
	/** dirty */
	r = true;
	/** current value */
	v;
	/** effect */
	e;

	constructor (getter) {
		let _this = this;

		_this.e = effect(getter, () => {
			if (!_this.r) {
				_this.r = true;
				trigger_effect(_this.d);
			}
		});

		_this.run(access);
	}

	run (next) {
		let _this = this;
		let deps = _this.d;
		let prev = _this.v;

		if (next === access) {
			track_effect(deps);

			if (_this.r) {
				_this.r = false;
				_this.v = _this.e.run();
			}

			return _this.v;
		}
		else {
			_this.r = false;
			_this.v = next;

			if (!is(prev, next)) {
				trigger_effect(deps);
			}

			return next;
		}
	}
}

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
		curr_effect.d.push(dep);
	}
}

function trigger_effect (dep) {
	for (let effect of dep) {
		if (effect.s) {
			effect.s();
		}
		else {
			effect.run();
		}
	}
}

function create_dep () {
	let dep = new Set();
	dep.w = 0;
	dep.n = 0;

	return dep;
}

function was_tracked (dep) {
	return (dep.w & curr_track_bit) > 0;
}

function new_tracked (dep) {
	return (dep.n & curr_track_bit) > 0;
}
