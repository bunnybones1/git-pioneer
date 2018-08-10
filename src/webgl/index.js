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

require('extensions/function');


function GraphGarden() {
	var _this = this;
	var viewManager = new ViewManager();
	var inputManager = new InputManager(viewManager.canvas);
	viewManager.view.renderManager.onEnterFrame.add(inputManager.fpsController.update);

	var gl = viewManager.view.renderer.context;
	var glState = viewManager.view.renderer.state;
	var masterCamera;
	var masterPortal;
	var masterPlayer;

	var passParams = [];

	function onBasePrerender(portal, camera, stencilScene) {
		viewManager.view.renderer.clear(false, true, true);
		viewManager.view.renderer.render(stencilScene, masterCamera);
		viewManager.view.renderer.clear(false, true, false);
	}
	function onPortaledPrerender(portal, camera, stencilScene) {
		portal.body.position.copy(masterPortal.body.position);
		camera.matrix.copy(masterCamera.matrixWorld);
		camera.projectionMatrix.copy(masterCamera.projectionMatrix);
		viewManager.view.renderer.clear(false, false, true);
		glState.enable(gl.STENCIL_TEST);
		gl.stencilFunc(gl.ALWAYS, 1, 0xff);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
		viewManager.view.renderer.render(stencilScene, masterCamera);
		gl.stencilFunc(gl.EQUAL, 1, 0xff);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
		viewManager.view.renderer.clear(false, true, false);
	}
	function onBasePostrender() {
	}
	function onPortaledPostrender() {
		glState.disable(gl.STENCIL_TEST);
	}

	function swapWorlds(backwards = false) {
		passParams.forEach(params => {
			params.portal.mesh.visible = backwards;
		});
		passParams.swap(0, 1);
		setRenderPasses();
	}

	function showPortals() {
		passParams.forEach(params => {
			params.portal.mesh.visible = true;
		});
	}

	function setRenderPasses() {
		viewManager.view.clearRenderPasses();
		passParams.forEach((params, i) => {
			if(i==0) {
				params.worldManager.enablePlayer(masterPlayer);
				masterPlayer = params.worldManager.player;
				masterCamera = params.camera;
				masterPortal = params.portal;
				params.camera.matrixAutoUpdate = true;
				masterPortal.onPlayerEnterSignal.add(swapWorlds);
				masterPortal.onPlayerExitSignal.add(showPortals);
				params.renderPassParams[3] = onBasePrerender.bind(null, params.portal, params.camera, params.stencilScene);
				params.renderPassParams[4] = onBasePostrender;
			} else {
				params.worldManager.disablePlayer();
				params.worldManager.player = masterPlayer;
				params.camera.matrixAutoUpdate = false;
				params.portal.onPlayerEnterSignal.remove(swapWorlds);
				params.portal.onPlayerExitSignal.remove(showPortals);
				params.renderPassParams[3] = onPortaledPrerender.bind(null, params.portal, params.camera, params.stencilScene);
				params.renderPassParams[4] = onPortaledPostrender;
			}
			params.renderPassParams[3] = params.renderPassParams[3].decorateBefore(params.worldManager.onEnterFrame).decorateBefore(params.worldManager.simulatePhysics);
			params.renderPassParams[4] = params.renderPassParams[4].decorateBefore(params.worldManager.onExitFrame);
			viewManager.view.addRenderPass.apply(viewManager.view, params.renderPassParams);
		});
	}

	for(var i = 0; i < 2; i++) {
		var camera = new three.PerspectiveCamera(60, undefined, 0.001, 40);
		var scene = new three.Scene();
		scene.add(camera);
		var worldManager = new WorldManager(viewManager.canvas, scene, camera, inputManager, viewManager.view.renderer);
		var stencilScene = new three.Scene();
		var portal = worldManager.portal;
		var portalMesh = portal.mesh;
		scene.remove(portalMesh);
		stencilScene.add(portalMesh);	

		worldManager.name = "world " + (i+1);
		scene.name = "scene " + (i+1);
		portal.name = "portal " + (i+1);
		scene.fog.color.setHex(i == 0 ? 0xff7f00 : 0x007fff);
		scene.background = new CheckerboardTexture(scene.fog.color, scene.fog.color, 4, 4);
		passParams.push({
			worldManager,
			scene,
			camera,
			portal,
			stencilScene,
			renderPassParams: [
				scene, 
				camera,
				undefined
			]
		});
	}

	setRenderPasses();
	// swapWorlds();
	this.widgetFctory = new WidgetFactory();
	// this.worldManager.addRelativeToPlayer(this.widgetFctory.makeThing());

	// this.gitManager = new GitManager(this);

	// this.gitVisualizer = new GitVisualizer(this);

	// this.gitManager.onNodeSignal.add(this.gitVisualizer.addNode);
}

module.exports = GraphGarden;