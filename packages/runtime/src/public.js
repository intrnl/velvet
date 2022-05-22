// Exposed public API

export {
	event_dispatcher as createEventDispatcher,

	on_mount as onMount,
	cleanup as onDestroy,

	inject,
	provide,
	ContextEvent,
} from './internal/index.js';
