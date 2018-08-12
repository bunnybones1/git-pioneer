var View = require("threejs-managed-view").View;
var urlParam = require("urlparam");

function ViewManager() {
	var view = new View({
		omitDefaultScene: true,
		rendererSettings: {
			autoClear: false,
			preserveDrawingBuffer: false
		}
	});
	view.renderManager.skipFrames = urlParam("skipFrames", 0);
	this.view = view;
	// this.scene = view.scene;
	// this.camera = view.camera;
	this.canvas = view.canvas;
}

module.exports = ViewManager;