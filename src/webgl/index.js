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
var UserFpsStandard = require('gameObjects/UserFpsStandard');
var SimpleHominidBody = require('gameObjects/SimpleHominidBody');

require('extensions/function');


function GraphGarden() {
	var _this = this;
	var viewManager = new ViewManager();
	var inputManager = new InputManager(viewManager.canvas);
	viewManager.view.renderManager.onEnterFrame.add(inputManager.fpsController.update);
	var onExitFrameOneTimeCallbacks = [];
	function onExitFrame() {
		if(onExitFrameOneTimeCallbacks.length > 0) {
			onExitFrameOneTimeCallbacks.forEach(cb => cb());
			onExitFrameOneTimeCallbacks.length = 0;
		}
	}
	viewManager.view.renderManager.onExitFrame.add(onExitFrame);

	var gl = viewManager.view.renderer.context;
	var glState = viewManager.view.renderer.state;
	var aspect = window.innerWidth / window.innerHeight;
	var masterCamera = new three.PerspectiveCamera(60, aspect, 0.01, 100);
	var userHead;
	var userHominid;

	var passParams = [];

	function onBasePrerender(portal, stencilScene) {
		viewManager.view.renderer.clear(false, true, true);
		viewManager.view.renderer.render(stencilScene, masterCamera);
		viewManager.view.renderer.clear(false, true, false);
	}
	function onPortaledPrerender(portal, stencilScene) {
		// portal.body.position.copy(masterPortal.body.position);
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

	function enqueueSwapWorlds(backwards = false) {
		onExitFrameOneTimeCallbacks.push(swapWorlds.bind(this, backwards));
	}

	function swapWorlds(backwards = false) {
		passParams.forEach(params => {
			params.portal.mesh.visible = backwards;
		});
		passParams.swap(0, 1);
		setRenderPasses();
	}


	function enqueueShowPortals() {
		onExitFrameOneTimeCallbacks.push(showPortals.bind(this));
	}

	function showPortals() {
		passParams.forEach(params => {
			params.portal.mesh.visible = true;
		});
	}

	function setRenderPasses() {
		viewManager.view.clearRenderPasses();
		for (var i = (passParams.length - 1); i>=0;i--) {
			var params = passParams[i];
			if(i==0) {
				params.worldManager.add(userHead);
				params.worldManager.add(userHominid);
				params.worldManager.userHead = userHead;
				userHominid.world = params.worldManager;
				params.portal.onPlayerEnterSignal.add(enqueueSwapWorlds);
				params.portal.onPlayerExitSignal.add(enqueueShowPortals);
				params.renderPassParams[3] = onBasePrerender.bind(null, params.portal, params.stencilScene);
				params.renderPassParams[4] = onBasePostrender;
			} else {
				params.worldManager.remove(userHead, null, true);
				params.worldManager.remove(userHominid, null, true);
				params.worldManager.userHead = null;
				params.portal.onPlayerEnterSignal.remove(enqueueSwapWorlds);
				params.portal.onPlayerExitSignal.remove(enqueueShowPortals);
				params.renderPassParams[3] = onPortaledPrerender.bind(null, params.portal, params.stencilScene);
				params.renderPassParams[4] = onPortaledPostrender;
			}
			params.renderPassParams[3] = params.renderPassParams[3].decorateBefore(params.worldManager.onEnterFrame).decorateBefore(params.worldManager.simulatePhysics);
			params.renderPassParams[4] = params.renderPassParams[4].decorateBefore(params.worldManager.onExitFrame);
		}
		for (var i = 0; i < passParams.length; i++) {
			var params = passParams[i];
			viewManager.view.addRenderPass.apply(viewManager.view, params.renderPassParams);
		}
	}

	for(var i = 0; i < 2; i++) {
		var scene = new three.Scene();
		var worldManager = new WorldManager(viewManager.canvas, scene, masterCamera, inputManager, viewManager.view.renderer);
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
			portal,
			stencilScene,
			renderPassParams: [
				scene, 
				masterCamera,
				undefined
			]
		});
	}
	var scene = passParams[0].scene;
	var world = passParams[0].worldManager;

	userHead = new UserFpsStandard(scene, masterCamera, inputManager);
	userHominid = new SimpleHominidBody(scene, masterCamera, inputManager);
	userHominid.user = userHead;

	setRenderPasses();
	// swapWorlds();
	this.widgetFctory = new WidgetFactory();
	// this.worldManager.addRelativeToPlayer(this.widgetFctory.makeThing());

	// this.gitManager = new GitManager(this);

	// this.gitVisualizer = new GitVisualizer(this);

	// this.gitManager.onNodeSignal.add(this.gitVisualizer.addNode);
}

module.exports = GraphGarden;