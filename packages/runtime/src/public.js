// Exposed public API

export let VERSION = process.env.RUNTIME_VERSION;

export {
	event_dispatcher as createEventDispatcher,
	on_mount as onMount,
	use_random_tags as useRandomTags,
} from './internal/component.js';

export {
	ContextEvent,
	inject,
	provide,
} from './internal/context.js';

export {
	batch,
	cleanup,
	cleanup as onDestroy,
	computed,
	effect,
	peek,
	Scope,
	scope,
	Signal,
	signal,
	untrack,
} from './internal/signals.js';
