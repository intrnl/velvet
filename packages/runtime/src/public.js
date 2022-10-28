// Exposed public API

export let VERSION = process.env.RUNTIME_VERSION;

export {
	use_random_tags as useRandomTags,
	event_dispatcher as createEventDispatcher,

	on_mount as onMount,
} from './internal/component.js';

export {
	ContextEvent,
	inject,
	provide,
} from './internal/context.js';

export {
	Scope,
	Signal,

	signal,
	computed,

	effect,
	batch,

	untrack,
	peek,

	scope,
	cleanup,

	cleanup as onDestroy,
} from './internal/signals.js';
