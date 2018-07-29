THREE = require('three');
var three = require('three');

var ViewManager = require('./ViewManager');
var InputManager = require('./InputManager');
var WorldManager = require('./WorldManager');
var WidgetFactory = require('./WidgetFactory');
var GitManager = require('./GitManager');
var GitVisualizer = require('./GitVisualizer');
var CodePreviewer = require('./CodePreviewer');
var CheckerboardTexture = require('threejs-texture-checkerboard');




function GraphGarden() {
	var _this = this;
	var viewManager = new ViewManager();
	var inputManager = new InputManager(viewManager.canvas);

	var gl = viewManager.view.renderer.context;
	var glState = viewManager.view.renderer.state;
	var masterCamera;
	var masterPortal;

	for(var i = 0; i < 2; i++) {
		(function() {
			var i2 = i;
			var camera = new three.PerspectiveCamera();
			var scene = new three.Scene();
			scene.add(camera);
			var worldManager = new WorldManager(viewManager.canvas, scene, camera, inputManager);
			var stencilScene = new three.Scene();
			var portal = worldManager.portal;
			var portalMesh = portal.mesh;
			scene.remove(portalMesh);
			if(i2==0) {
				masterCamera = camera;
				masterPortal = portal;
			}
			if(i2==1) {
				worldManager.remove(worldManager.player);
				scene.add(camera);
				camera.matrixAutoUpdate = false;
			}

			worldManager.portal.name = "portal " + i;
			stencilScene.add(worldManager.portal.mesh);
			var stencilFunc = i == 0 ? gl.NOTEQUAL : gl.EQUAL;
			scene.fog.color.setHex(i == 0 ? 0xff7f00 : 0x007fff);
			scene.background = new CheckerboardTexture(scene.fog.color, scene.fog.color, 4, 4);
			viewManager.view.addRenderPass(
				scene, 
				camera,
				undefined, 
				() => {
					if(i2==0){
						viewManager.view.renderer.clear(false, true, true);
					} else {
						portal.body.position.copy(masterPortal.body.position);
						camera.matrix.copy(masterCamera.matrixWorld);
						camera.projectionMatrix.copy(masterCamera.projectionMatrix);
						viewManager.view.renderer.clear(false, false, true);
						glState.enable(gl.STENCIL_TEST);
						gl.stencilFunc(gl.ALWAYS, 1, 0xff);
						gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
					}
					viewManager.view.renderer.render(stencilScene, masterCamera);
					if(i2!==0) {
						gl.stencilFunc(stencilFunc, 1, 0xff);
						gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
					}
					viewManager.view.renderer.clear(false, true, false);
				},
				() => {
					if(i2!==0) {
						glState.disable(gl.STENCIL_TEST);
					}
				}
			);
		})();
	}
	this.widgetFctory = new WidgetFactory();
	// this.worldManager.addRelativeToPlayer(this.widgetFctory.makeThing());

	// this.gitManager = new GitManager(this);

	// this.gitVisualizer = new GitVisualizer(this);

	// this.gitManager.onNodeSignal.add(this.gitVisualizer.addNode);
}

module.exports = GraphGarden;