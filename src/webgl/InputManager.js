var Pointers = require("input-unified-pointers");
var FPSController = require("threejs-camera-controller-first-person-desktop");

function InputManager(canvas) {
	var pointers = new Pointers(canvas);
	var fpsController = new FPSController(canvas, 
		{
			movementSpeed: 0.1
		}
	);

	this.pointers = pointers;
	this.fpsController = fpsController;
}

module.exports = InputManager;