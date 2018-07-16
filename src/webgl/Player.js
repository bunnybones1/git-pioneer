var three = require('three');
var FPSController = require('threejs-camera-controller-first-person-desktop');
var Crosshair = require('threejs-gui-crosshair');
var CANNON = require('cannon');
var Signal = require('signals').Signal;
var CollisionLayers = require('CollisionLayers');
var clamp = require('clamp');
require('extensions/array');

var sizeSpeedMax = 0.1;
var sizeSpeedStep = 0.001;

function Player(scene, camera, canvas, pointers, world) {
	this.playerSize = 1;
	this.sizeSpeed = 0;

	var _activeTool = null;
	var tools = [];
	Object.defineProperty(this, "activeTool", {
		get: function() {
			return _activeTool;
		},
		set: function(val) {
			if(_activeTool != null) {
				_activeTool.mesh.parent.remove(_activeTool.mesh);
			}
			tools.pushUnique(val);
			_activeTool = val;
			_activeTool.player = this;
			_activeTool.onEnterFrame = _activeTool.onEnterFrameEquipped;
			handPivot.add(_activeTool.mesh);
			_activeTool.subMesh.rotation.set(0, 0, 0);
			_activeTool.mesh.rotation.set(0, 0, 0);
			_activeTool.mesh.position.set(0, 0, 0);
		}
	})
	
	var onPlayerSizeChangedSignal = new Signal();
	camera.near = 0.001;
	camera.far = 40;
	var fog = new THREE.Fog( 0x7f7f7f, camera.near, camera.far);
	scene.fog = fog;
	camera.updateProjectionMatrix();
	var pointLight = new THREE.PointLight(0xffffff, 1, 1, 2);
	camera.add(pointLight);

	camera.up.set(0,0,1);
	camera.position.set(0, 30, 30);
	camera.lookAt(new THREE.Vector3());

	var fpsController = new FPSController(camera, canvas, 
		{
			upAxis: 'z',
			yUp: false,
			movementSpeed: 0.1
		}
	);
	var keyboard = fpsController.keyboard;



	// bodyShape.material = groundMaterial;
	var playerBody = new CANNON.Body({
		mass: 50, // kg 
		position: new CANNON.Vec3(0, 5, 5), // m 
		rotation: new CANNON.Vec3(0, 1, 0), // m 
		fixedRotation: true,
		linearDamping: 0.5,
		resistGravity: true,
		collisionFilterGroup: CollisionLayers.PLAYER,
		collisionFilterMask: CollisionLayers.ENVIRONMENT | CollisionLayers.ITEMS
	});
	var bodySphereRecipe = [
		[0, 1, 0, 0.5],
		[0, 0, 0, 0.1]
	];
	for(var i = 0; i < bodySphereRecipe.length; i++) {
		var d = bodySphereRecipe[i];
		var shape = new CANNON.Sphere(d[3]);
		playerBody.addShape(shape, new CANNON.Vec3(d[0], d[1], d[2]));
	}
	playerBody.quaternion.setFromEuler(Math.PI * 0.5, 0, 0);
	playerBody.position.set(0, 6, 6);
	var playerMesh = new three.Object3D();
	var headPivot = new three.Object3D();
	var handPivot = new three.Object3D();
	headPivot.add(camera);
	this.headY = 1.05;
	headPivot.position.y = this.headY;
	camera.position.set(0, 0, 0);
	headPivot.rotation.x = Math.PI * -0.5;
	playerMesh.add(headPivot);
	handPivot.position.set(0.4, -0.25, 0.65);
	handPivot.rotation.set(Math.PI * 0.5, 0, 0);

	playerBody.player = this;


	var crosshair = new Crosshair();
	camera.add(crosshair);
	crosshair.position.z = -1;
	crosshair.add(handPivot);

	playerBody.addEventListener("collide", function(collision) {
		if(collision.target == playerBody && collision.body.interactiveObject != null) {
			var interactiveObject = collision.body.interactiveObject;
			if(interactiveObject.type == "tool") {
				world.remove(interactiveObject.object, function() {
					collision.body.player.addTool(interactiveObject.object);
				});
			}
		}
	});


	var result = new CANNON.RaycastResult();
	var raycastOptions = {
		collisionFilterMask: CollisionLayers.ENVIRONMENT
	};
	var rayFrom = playerBody.position;
	var rayTo = playerBody.position.clone();

	pointers.onPointerDownSignal.add(onPointerDown.bind(this));
	pointers.onPointerUpSignal.add(onPointerUp.bind(this));

	this.yUp = true;
	this.keyboard = keyboard;
	this.pointLight = pointLight;
	this.camera = camera;
	this.fog = fog;
	this.scene = scene;
	this.world = world;
	this.mesh = playerMesh;
	this.body = playerBody;
	this.headPivot = headPivot;
	this.bodySphereRecipe = bodySphereRecipe;

	this.result = result;
	this.raycastOptions = raycastOptions;
	this.rayFrom = rayFrom;
	this.rayTo = rayTo;
	this.fpsController = fpsController;
	this.crosshair = crosshair;
	this.onPlayerSizeChangedSignal = onPlayerSizeChangedSignal;

	this.tools = tools;

	this.onUpdateSim = onUpdateSim.bind(this);
	this.onEnterFrame = onEnterFrame.bind(this);
	this.addTool = addTool.bind(this);

	camera.rotation.x = Math.PI * -0.5;
	camera.updateMatrix();
	camera.updateMatrixWorld();

}

function onEnterFrame(timeScale) {
	this.fpsController.update();
	var sizeChanged;
	if(this.keyboard.isPressed('openbracket')) {
		sizeChanged = true;
		this.sizeSpeed -= sizeSpeedStep;
	}
	if(this.keyboard.isPressed('closebraket')) {
		sizeChanged = true;
		this.sizeSpeed += sizeSpeedStep;
	}
	if(!sizeChanged) {
		this.sizeSpeed = 0;
	}
	if(sizeChanged) {
		var playerSize = this.playerSize;
		playerSize *= (1 + this.sizeSpeed);
		playerSize = clamp(playerSize, 0.00001, 40);
		this.fpsController.movementSpeed = 0.1 * playerSize;
		this.pointLight.distance = playerSize;
		this.fog.near = this.camera.near = playerSize * 0.001;
		this.fog.far = playerSize * 40;
		this.camera.far = this.fog.far + 0.1;
		this.camera.updateProjectionMatrix();
		this.onPlayerSizeChangedSignal.dispatch(playerSize);
		for(var i = 0; i < this.bodySphereRecipe.length; i++) { 
			var d = this.bodySphereRecipe[i];
			this.body.shapes[i].radius = d[3] * playerSize;
			this.body.shapeOffsets[i].set(d[0] * playerSize, d[1] * playerSize, d[2] * playerSize);
		}
		this.body.mass = 50 * Math.pow(playerSize, 3);
		this.body.updateMassProperties();
		this.headPivot.position.y = this.headY * playerSize;
		this.crosshair.scale.set(playerSize, playerSize, playerSize);
		this.crosshair.position.z = -playerSize;
		this.playerSize = playerSize;
	}
	if(this.keyboard.consumePressed('dash')) {
		if(!this.activeTool) return;
		this.activeTool = this.tools.prev(this.activeTool);
	}
	if(this.keyboard.consumePressed('equals')) {
		if(!this.activeTool) return;
		this.activeTool = this.tools.next(this.activeTool);
	}


	if(this.activeTool && this.activeTool.onEnterFrame) {
		this.activeTool.onEnterFrame(timeScale);
	}
}

function onUpdateSim() {
	var playerBody = this.body;
	var camera = this.camera;
	// camera.position.z = 0;
	playerBody.position.vadd(camera.position, playerBody.position);
	// playerBody.velocity.vadd(camera.position, playerBody.velocity);
	camera.position.set(0, 0, 0);
	if(this.yUp) {
		camera.lookAt(camera.parent.worldToLocal(this.crosshair.localToWorld(new three.Vector3())));
	}
	if(this.keyboard.isPressed('space')) {
		this.rayTo.copy(this.rayFrom);
		this.rayTo.z -= 0.1 * this.playerSize;
		this.world.world.raycastClosest(this.rayFrom, this.rayTo, this.raycastOptions, this.result);
		if(this.result.hasHit) {
			playerBody.applyImpulse(new CANNON.Vec3(0, 0, playerBody.mass * 10), playerBody.position);
		}
	}
}

function onPointerDown(x, y, id) {
	if(this.activeTool && this.activeTool.primaryFireStart) {
		var pos = this.crosshair.localToWorld(new three.Vector3());
		this.activeTool.primaryFireStart(pos, this.playerSize);
	}
}

function onPointerUp(x, y, id) {
	if(this.activeTool && this.activeTool.primaryFireEnd) {
		var pos = this.crosshair.localToWorld(new three.Vector3());
		this.activeTool.primaryFireEnd(pos, this.playerSize);
	}
}

function addTool(tool) {
	var added = this.tools.pushUnique(tool);
	if(added) {
		this.activeTool = tool;
	}
	return added;
}

module.exports = Player;