import App from './App.velvet';
import './style.css';

// we don't want the Shadow DOM to be in our way here, have `attachShadow`
// return itself instead of creating a shadow root.
// there isn't any specific reasons why other than making it easier to mess
// around like in the cases of benchmark automation.
App.prototype.attachShadow = function () {
	return this;
};

const app = new App();
document.body.append(app);
