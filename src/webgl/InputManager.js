var Pointers = require('input-unified-pointers');
var FPSController = require('threejs-camera-controller-first-person-desktop');

function InputManager(canvas) {
	var pointers = new Pointers(canvas);
	var fpsController = new FPSController(null, canvas, 
		{
			upAxis: 'z',
			yUp: false,
			movementSpeed: 0.1
		}
	);

	this.pointers = pointers;
	this.fpsController = fpsController;
}

module.exports = InputManager;