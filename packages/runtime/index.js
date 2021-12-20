// Exposed public API

export {
	event_dispatcher as createEventDispatcher,
	on_mount as onMount,
	cleanup as onDestroy,
} from './internal/index.js';
