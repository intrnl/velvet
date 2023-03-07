import App from './components/App.velvet';
import VizDemo from './components/VizDemo.velvet';

import * as perfmon from 'perf-monitor';

import './style.css';

patchComponent(App);
patchComponent(VizDemo);

if (!(/[&?]perfmon=(false|off|0)\b/).test(location.search)) {
	perfmon.startFPSMonitor();
	perfmon.startMemMonitor();
}

const spiral = new App();
document.body.appendChild(spiral);

function patchComponent (Component) {
	// we don't want shadow DOM to be in our way here, make Velvet think we
	// already have a shadow root in place.
	Component.prototype.attachShadow = function () {
		if (!this.shadowRoot) {
			Object.defineProperty(this, 'shadowRoot', { value: this });
		}

		return this;
	};
}
