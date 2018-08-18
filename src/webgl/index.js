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

var geomLib = require("geometry/lib");
var matLib = require("materials/lib");
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
	var totalPortals = 0;
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

	var s = toolWorld.scene;
	var camPool = [];
	function makeCamCopy(original) {
		var clone = camPool.find(cam => {
			return !cam.helper.visible;
		});
		if(!clone) {
			clone = original.clone();
			clone.matrixAutoUpdate = false;
			var cloneHelper = new three.CameraHelper(clone);
			clone.helper = cloneHelper;
			s.add(clone);
			s.add(cloneHelper);
			camPool.push(clone);
		}
		clone.matrix.copy(testCam1.matrix);
		clone.matrixWorld.copy(testCam1.matrixWorld);
		clone.projectionMatrix.copy(testCam1.projectionMatrix);
		return clone;
	}
	var testRadius = 0.3;
	var testCam1 = new three.PerspectiveCamera(40, 16/9, 0.5, 4);
	testCam1.position.set(1, 0, 1.6);
	testCam1.rotation.set(Math.PI * 0.5, Math.PI * 0.5, 0);
	s.add(testCam1);
	var testCam1Helper = new three.CameraHelper(testCam1);
	s.add(testCam1Helper);
	testCam1.helper = testCam1Helper;
	var testSpheres = [];
	function makeTestSphere(speed) {
		var testSphere = new three.Line(geomLib.sphereHelper(testRadius), matLib.helperLines().clone());
		var testSphereIndicator = new three.Line(geomLib.sphereHelper(testRadius*1.01), matLib.helperLines(0x7f7f7f));
		s.add(testSphere);
		testSphere.add(testSphereIndicator);
		testSphere.position.set(-1, 1, 1.6);
		var sphere = new three.Sphere(testSphere.position, testSphere.geometry.radius);
		sphere.center = testSphere.position;
		testSphere.sphere = sphere;
		testSphere.onEnterFrame = (t) => {
			testSphere.position.x = Math.cos(t * 0.0125 * speed) * 1.5 - 2;
			testSphere.position.z = Math.cos(t * 0.0015 * speed) * 0.5 + 1.6;
			testSphere.position.y = Math.cos(t * 0.001 * speed) * 0.2;
		};
		testSpheres.push(testSphere);
		return testSphere;
	}
	makeTestSphere(0.2);
	makeTestSphere(0.3);
	var frustum = new three.Frustum();
	var projScreenMatrix = new three.Matrix4();
	var ss = 500;
	var ssHalf = ss * 0.5;
	function sClamp(min, max, value) {
		return Math.clamp(value, min, max);
	}
	var xClamp = sClamp.bind(null, 0, 1920);
	var yClamp = sClamp.bind(null, 0, 1080);
	view.renderManager.onEnterFrame.add((t) => {
		// testCam1.position.y = Math.cos(t * 0.0002);
		testCam1.updateMatrix();
		testCam1.updateMatrixWorld();
		projScreenMatrix.multiplyMatrices( testCam1.projectionMatrix, testCam1.matrixWorldInverse );
		frustum.setFromMatrix( projScreenMatrix );
		
		testSpheres.forEach(testSphere => {
			testSphere.onEnterFrame(t);

			var deeper = frustum.intersectsSphere(testSphere.sphere);
			testSphere.material.visible = deeper;
			if(deeper) {
				var testCam2 = makeCamCopy(testCam1);
				testCam2.helper.visible = testSphere.material.visible;
				if(testCam2.helper.visible) {
					testCam2.matrix.copy(testCam1.matrix);
					testCam2.matrixWorld.copy(testCam1.matrixWorld);
					testCam2.projectionMatrix.copy(testCam1.projectionMatrix);
					var orientedOffset = new three.Vector3(testRadius, 0, 0).applyQuaternion(testCam2.getWorldQuaternion());

					var pos = testSphere.position.clone();
					pos.applyMatrix4(projScreenMatrix);
					var offset = testSphere.position.clone().add(orientedOffset);
					offset.applyMatrix4(projScreenMatrix);
					ss = offset.sub(pos).length() * 1080 * 2;
					ssHalf = ss * 0.5;
					var x = (pos.x*0.5+0.5) * 1920 - ssHalf;
					var y = (-pos.y*0.5+0.5) * 1080 - ssHalf;
					var w = ss;
					var h = ss;
					if(y + h > 1080) {
						h = 1080 - y;
					} else if(y < 0) {
						h += y;
					}
					if(x + w > 1080) {
						w = 1080 - x;
					} else if(x < 0) {
						w += x;
					}


					testCam2.setViewOffset(
						1920, 
						1080, 
						xClamp(x),
						yClamp(y),
						w,
						h
					);
					testCam2.updateProjectionMatrix();
					testCam2.helper.update();
				}
			}
		});
	});
	
	view.renderManager.onExitFrame.add((t) => {
		camPool.forEach(cam => cam.helper.visible = false);
	});

	setRenderPasses();
	// swapWorlds();
	this.widgetFctory = new WidgetFactory();
	// this.world.addRelativeToPlayer(this.widgetFctory.makeThing());

	// this.gitManager = new GitManager(this);

	// this.gitVisualizer = new GitVisualizer(this);

	// this.gitManager.onNodeSignal.add(this.gitVisualizer.addNode);
}

module.exports = GitPioneerWebGL;