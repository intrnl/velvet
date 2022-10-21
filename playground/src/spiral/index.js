import Spiral from './components/Spiral.velvet';
import Cursor from './components/Cursor.velvet';

import './style.css';


patchComponent(Spiral);
patchComponent(Cursor);

const spiral = new Spiral();
document.body.appendChild(spiral);


function patchComponent (Component) {
	// we don't want shadow DOM to be in our way here, make Velvet think we
	// already have a shadow root in place.
	Component.prototype.attachShadow = function () {
		if (!this.shadowRoot) {
			Object.defineProperty(this, 'shadowRoot', { value: this })
		}

		return this;
	};
}
