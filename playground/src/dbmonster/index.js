import * as perfmon from 'perf-monitor';

import App from './App.velvet';
import './style.css';


// we don't need shadow DOM here, make Velvet think it's already been created.
App.prototype.attachShadow = function () {
	return this;
};

const app = new App();
app.dbs = ENV.generateData().toArray();

document.body.appendChild(app);

perfmon.startFPSMonitor();
perfmon.startMemMonitor();
perfmon.initProfiler('view update');

function redraw () {
	const next = ENV.generateData().toArray();

	perfmon.startProfile('view update');
	app.dbs = next;
	perfmon.endProfile('view update');

	setTimeout(redraw, ENV.timeout);
}

redraw();
