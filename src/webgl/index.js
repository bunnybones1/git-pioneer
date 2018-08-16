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

var tools = require("gameObjects/tools");

require("extensions/function");


function GitPioneerWebGL() {
	var viewManager = new ViewManager();
	var view = viewManager.view;
	var inputManager = new InputManager(viewManager.canvas);
	view.renderManager.onEnterFrame.add(inputManager.fpsController.update);
	var onExitFrameOneTimeCallbacks = [];
	var extraRenderPasses = [];
	var maxExtraRenderPasses = 2;
	function onEnterFrame() {
	}

	var currentWorld;

	var worldsPhysicsProcessed = [];
	function onExitFrame() {
		if(onExitFrameOneTimeCallbacks.length > 0) {
			onExitFrameOneTimeCallbacks.forEach(cb => cb());
			onExitFrameOneTimeCallbacks.length = 0;
		}
		extraRenderPasses.length = 0;
		view.clearRenderPasses(1);
		worldsPhysicsProcessed.length = 0;
	}

	view.renderManager.onEnterFrame.add(onEnterFrame);
	view.renderManager.onExitFrame.add(onExitFrame);

	var renderer = view.renderer;
	var gl = renderer.context;
	var glState = renderer.state;
	var aspect = window.innerWidth / window.innerHeight;
	var masterCamera = new three.PerspectiveCamera(60, aspect, 0.01, 100);
	var userHead;
	var userHominid;

	var worlds = [];

	var stencilScene = new three.Scene();
	var stencilCamera = new three.PerspectiveCamera();
	stencilCamera.matrixAutoUpdate = false;
	stencilScene.add(stencilCamera);

	function onBasePrerender() {
		masterCamera.near = 0.01;
		masterCamera.updateProjectionMatrix();
		renderer.clear(false, true, true);
	}

	function onPortaledPrerender(portal, cam) {
		var matrix = new three.Matrix4();
		matrix.getInverse(cam.matrixWorld);
		cam.near = portal.mesh.position.clone().applyMatrix4(matrix).z * -1 - portal.radius * 0.5;
		cam.updateProjectionMatrix();
		var origin = portal.mesh.parent;
		stencilCamera.matrix.copy(cam.matrixWorld);
		stencilCamera.matrixWorld.copy(cam.matrixWorld);
		stencilCamera.projectionMatrix.copy(cam.projectionMatrix);
		stencilScene.add(portal.mesh);
		// portal.portalLink.other(portal).mesh.visible = true;
		portal.mesh.visible = true;
		portal.portalLink.stencilTime = true;
		// portal.body.position.copy(masterPortal.body.position);
		renderer.clear(false, false, true);
		glState.enable(gl.STENCIL_TEST);
		gl.stencilFunc(gl.ALWAYS, 1, 0xff);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
		renderer.render(stencilScene, stencilCamera);
		gl.stencilFunc(gl.EQUAL, 1, 0xff);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
		renderer.clear(false, true, false);
		stencilScene.remove(portal.mesh);
		origin.add(portal.mesh);
		portal.portalLink.stencilTime = false;
		portal.portalLink.other(portal).mesh.visible = false;
		portal.mesh.visible = false;
	}

	function onPortaledPostrender(portal) {
		portal.portalLink.other(portal).mesh.visible = true;
		portal.mesh.visible = true;
		glState.disable(gl.STENCIL_TEST);
	}

	function enqueueSwapWorlds(portal, backwards = false) {
		onExitFrameOneTimeCallbacks.push(swapWorlds.bind(this, portal, backwards));
	}

	function swapWorlds(portal, backwards = false) {
		portal.mesh.visible = backwards;
		portal.portalLink.other(portal).mesh.visible = backwards;
		worlds.swap(0, 1);
		setRenderPasses();
		userHead.body.position.vsub(portal.body.position.vsub(portal.portalLink.other(portal).body.position), userHead.body.position);
	}


	function enqueueShowPortals(portal) {
		onExitFrameOneTimeCallbacks.push(showPortals.bind(this, portal));
	}

	function showPortals(portal) {
		portal.mesh.visible = true;
		portal.portalLink.other(portal).mesh.visible = true;
	}

	function setRenderPasses() {
		view.clearRenderPasses(0);
		if(currentWorld) {
			currentWorld.userHead = null;
			currentWorld.portals.forEach(portal => {
				portal.onPlayerEnterSignal.remove(enqueueSwapWorlds);
				portal.onPlayerExitSignal.remove(enqueueShowPortals);
			});
			currentWorld.remove(userHead);
			currentWorld.remove(userHominid);
		}
		currentWorld = worlds[0];
		currentWorld.add(userHead);
		currentWorld.add(userHominid);
		currentWorld.userHead = userHead;
		userHominid.world = currentWorld;
		currentWorld.portals.forEach(portal => {
			portal.onPlayerEnterSignal.add(enqueueSwapWorlds);
			portal.onPlayerExitSignal.add(enqueueShowPortals);
		});

		addWorldToRender(currentWorld, true);
	}
	function addWorldToRender(world, base = false) {
		var prerender = world.onEnterFrame.decorateBefore(function(time) {
			if(!worldsPhysicsProcessed.contains(world)) {
				worldsPhysicsProcessed.push(world);
				world.simulatePhysics(time);
			}
		});
		if(base) {
			prerender = onBasePrerender.decorateBefore(prerender);
		}
		view.addRenderPass(
			world.scene,
			masterCamera,
			world.scene.fog.color,
			prerender, 
			world.onExitFrame
		);
	}

	var j;
	var totalPortals = 1;
	for(var i = 0; i < 2; i++) {
		var world = new WorldManager(viewManager.canvas, masterCamera, inputManager, renderer);
		var scene = world.scene;
		world.name = "world " + (i+1);
		scene.name = "scene " + (i+1);
		scene.fog.color.setHex(i == 0 ? 0xff7f00 : 0x007fff);
		scene.background = new CheckerboardTexture(scene.fog.color, scene.fog.color, 4, 4);

		var portals = [];
		world.portals = portals;
		for(j = 0; j < totalPortals; j++) {
			var portal = new Portal(new cannon.Vec3(0, j * 2, 1.5));
			portal.name = "portal " + (i+1) + "." + (j+1);
			portal.world = world;
			var r = 0.25;
			portal.body.quaternion.setFromEuler(Math.random2(r), Math.random2(r), Math.random2(r));
			world.add(portal);
			portals.push(portal);
		}

		worlds.push(world);
	}


	var toolWorld = worlds[0];
	var i = 0;
	for(var tool in tools){
		toolWorld.add(new tools[tool](new cannon.Vec3( -6 + Math.random(),i, 1)));
		i += 2;
	}

	userHead = new UserFpsStandard(masterCamera, inputManager);
	userHominid = new SimpleHominidBody(masterCamera, inputManager);
	userHominid.user = userHead;

	function onRequestRenderPass(fromPortal) {
		if(extraRenderPasses.length < maxExtraRenderPasses) {
			fromPortal.mesh.visible = false;
			fromPortal.portalLink.other(fromPortal).mesh.visible = false;
			extraRenderPasses.push(fromPortal);
			var toPortal = fromPortal.portalLink.other(fromPortal);
			var world = toPortal.portalLink.other(fromPortal).world;
			var cam = masterCamera.clone();
			cam.matrix = masterCamera.matrix.clone();
			cam.matrixWorld = masterCamera.matrixWorld.clone();
			cam.matrixWorld.premultiply(toPortal.getDeltaMatrix());
			cam.projectionMatrix = masterCamera.projectionMatrix.clone();
			cam.matrixAutoUpdate = false;
			view.addRenderPass(
				world.scene,
				cam,
				undefined,
				onPortaledPrerender.bind(null, toPortal, cam).decorateBefore(world.onEnterFrame).decorateBefore(function(time) {
					if(!worldsPhysicsProcessed.contains(world)) {
						worldsPhysicsProcessed.push(world);
						world.simulatePhysics(time);
					}
				}),
				onPortaledPostrender.bind(null, toPortal).decorateBefore(world.onExitFrame)
			);
	
		}
	}

	for(j = 0; j < totalPortals; j++) {
		var portalLink = new PortalLink(worlds[0].portals[j], worlds[1].portals[j]);
		portalLink.requestRenderPassSignal.add(onRequestRenderPass);
	}
	setRenderPasses();
	// swapWorlds();
	this.widgetFctory = new WidgetFactory();
	// this.world.addRelativeToPlayer(this.widgetFctory.makeThing());

	// this.gitManager = new GitManager(this);

	// this.gitVisualizer = new GitVisualizer(this);

	// this.gitManager.onNodeSignal.add(this.gitVisualizer.addNode);
}

module.exports = GitPioneerWebGL;