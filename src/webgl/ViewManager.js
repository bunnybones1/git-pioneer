var View = require('threejs-managed-view').View;
var urlParam = require('urlparam');

function ViewManager(app) {
	var view = new View();
	view.renderManager.skipFrames = urlParam('skipFrames', 0);

	this.view = view;
	this.scene = view.scene;
	this.camera = view.camera;
	this.canvas = view.canvas;
}

module.exports = ViewManager;