window.THREE = require("three");
var three = require("three");
var cannon = require("cannon");

var ViewManager = require("./ViewManager");
var InputManager = require("./InputManager");
var WorldManager = require("./WorldManager");
var WidgetFactory = require("./WidgetFactory");
// var GitManager = require("./GitManager");
// var GitVisualizer = require("./GitVisualizer");
// var CodePreviewer = require("./CodePreviewer");
var CheckerboardTexture = require("threejs-texture-checkerboard");
var UserFpsStandard = require("gameObjects/UserFpsStandard");
var SimpleHominidBody = require("gameObjects/SimpleHominidBody");
var Portal = require("gameObjects/Portal");
var PortalLink = require("gameObjects/PortalLink");

require("extensions/function");


function GraphGarden() {
	var viewManager = new ViewManager();
	var inputManager = new InputManager(viewManager.canvas);
	viewManager.view.renderManager.onEnterFrame.add(inputManager.fpsController.update);
	var onExitFrameOneTimeCallbacks = [];
	var extraRenderPasses = [];
	var maxExtraRenderPasses = 2;
	function onExitFrame() {
		if(onExitFrameOneTimeCallbacks.length > 0) {
			onExitFrameOneTimeCallbacks.forEach(cb => cb());
			onExitFrameOneTimeCallbacks.length = 0;
		}
		extraRenderPasses.length = 0;
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
			params.portals.forEach(portal => {
				portal.mesh.visible = backwards;
			});
		});
		passParams.swap(0, 1);
		setRenderPasses();
	}


	function enqueueShowPortals() {
		onExitFrameOneTimeCallbacks.push(showPortals.bind(this));
	}

	function showPortals() {
		passParams.forEach(params => {
			params.portals.forEach(portal => {
				portal.mesh.visible = true;
			});
		});
	}

	function setRenderPasses() {
		viewManager.view.clearRenderPasses();
		var i, params;
		for (i = (passParams.length - 1); i>=0 ;i--) {
			params = passParams[i];
			var portals = params.portals;
			var worldMan = params.worldManager;
			var renderPassParams = params.renderPassParams;
			if(i==0) {
				worldMan.add(userHead);
				worldMan.add(userHominid);
				worldMan.userHead = userHead;
				userHominid.world = worldMan;
				portals.forEach(portal => {
					portal.onPlayerEnterSignal.add(enqueueSwapWorlds);
					portal.onPlayerExitSignal.add(enqueueShowPortals);
				});
				renderPassParams[3] = onBasePrerender.bind(null, portal, params.stencilScene);
				renderPassParams[4] = onBasePostrender;
			} else {
				worldMan.remove(userHead, null, true);
				worldMan.remove(userHominid, null, true);
				worldMan.userHead = null;
				portals.forEach(portal => {
					portal.onPlayerEnterSignal.remove(enqueueSwapWorlds);
					portal.onPlayerExitSignal.remove(enqueueShowPortals);
				});
				renderPassParams[3] = onPortaledPrerender.bind(null, portal, params.stencilScene);
				renderPassParams[4] = onPortaledPostrender;
			}
			renderPassParams[3] = renderPassParams[3].decorateBefore(worldMan.onEnterFrame).decorateBefore(worldMan.simulatePhysics);
			renderPassParams[4] = renderPassParams[4].decorateBefore(worldMan.onExitFrame);
		}
		for (i = 0; i < passParams.length; i++) {
			params = passParams[i];
			viewManager.view.addRenderPass.apply(viewManager.view, params.renderPassParams);
		}
	}

	var scene, j;
	for(var i = 0; i < 2; i++) {
		scene = new three.Scene();
		var worldManager = new WorldManager(viewManager.canvas, scene, masterCamera, inputManager, viewManager.view.renderer);
		var stencilScene = new three.Scene();

		worldManager.name = "world " + (i+1);
		scene.name = "scene " + (i+1);
		scene.fog.color.setHex(i == 0 ? 0xff7f00 : 0x007fff);
		scene.background = new CheckerboardTexture(scene.fog.color, scene.fog.color, 4, 4);

		var portals = [];
		for(j = -2; j < 2; j+=3) {
			var portal = new Portal(new cannon.Vec3(j * 2, 1, 1.5));
			portal.world = worldManager;
			worldManager.add(portal);
			worldManager.portal = portal;

			var portalMesh = portal.mesh;
			scene.remove(portalMesh);
			stencilScene.add(portalMesh);
			portal.name = "portal " + (i+1) + "." + (j+1);
			portals.push(portal);
		}

		passParams.push({
			worldManager,
			scene,
			portals,
			stencilScene,
			renderPassParams: [
				scene, 
				masterCamera,
				undefined
			]
		});
	}
	
	scene = passParams[0].scene;

	userHead = new UserFpsStandard(scene, masterCamera, inputManager);
	userHominid = new SimpleHominidBody(scene, masterCamera, inputManager);
	userHominid.user = userHead;

	function onRequestRenderPass(fromPortal) {
		if(extraRenderPasses.length < maxExtraRenderPasses) {
			extraRenderPasses.push(fromPortal);
		}
	}

	for(j = 0; j < 2; j++) {
		var portalLink = new PortalLink(passParams[0].portals[j], passParams[1].portals[j]);
		portalLink.requestRenderPassSignal.add(onRequestRenderPass);
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