var three = require('three');
var CheckerboardTexture = require('threejs-texture-checkerboard');
var CANNON = require('cannon');
var urlParam = require('urlparam');
var clamp = require('clamp');
var Signal = require('signals').Signal;
var Player = require('./Player');

var BallMaker = require('gameObjects/tools/BallMaker');

var CollisionLayers = require('CollisionLayers');

function WorldManager(app) {
	var scene = app.viewManager.scene;
	var view = app.viewManager.view;
	var camera = app.viewManager.camera;
	var canvas = app.viewManager.canvas;
	var pointers = app.inputManager.pointers;

	view.renderer.setClearColor(0x7f7f7f);

	var planeMaterial = new THREE.MeshPhongMaterial({
		map: new CheckerboardTexture(0x6f4f3f, 0x7f5f4f, 1000, 1000)
	});
	var plane = new THREE.Mesh(
		new THREE.PlaneGeometry(1000, 1000, 1, 1),
		planeMaterial
	);

	scene.add(plane);

	var world = new CANNON.World();
	world.gravity.set(0, 0, -16);
	world.gravity.w = 0.4;
	world.broadphase = new CANNON.NaiveBroadphase();
	world.solver.iterations = 10;

	var objects = [];

	var ambient = new THREE.HemisphereLight(0x7fafcf, 0x6f4f3f, 1); 
	ambient.position.set(0, 0, 100);
	scene.add(ambient);

	var groundBody = new CANNON.Body({
			mass: 0, // mass == 0 makes the body static
			collisionFilterGroup: CollisionLayers.ENVIRONMENT,
			collisionFilterMask: CollisionLayers.PLAYER | CollisionLayers.ITEMS
	});
	var groundShape = new CANNON.Plane();

	var groundMaterial = new CANNON.Material();
	groundMaterial.friction = 0.9;

	groundShape.material = groundMaterial;
	groundBody.addShape(groundShape);
	world.addBody(groundBody);

	function add(object) {
		scene.add(object.mesh);
		world.addBody(object.body);
		objects.push(object);
	}
	var queueToRemove = [];
	function requestRemove(object, callback) {
		queueToRemove.push([object, callback]);
	}
	function remove(object, callback) {
		scene.remove(object.mesh);
		world.removeBody(object.body);
		var index = objects.indexOf(object);
		if(index != -1) {
			objects.splice(index, 1);
		}
		callback();
	}


	var player = new Player(scene, camera, canvas, pointers, this);

	add(player);


	var fixedTimeStep = 1.0 / 60.0; // seconds 
	var maxSubSteps = 3;
	 
	var radius = 0.5; // m 
	var geometry = new THREE.SphereGeometry(radius, 32, 16);

	var material = new THREE.MeshPhongMaterial({
		color: 0xffffff,
		map: new CheckerboardTexture()
	});

	function makeBall(x, y, z, size) {
		var ballMesh = new THREE.Mesh(
			geometry,
			material
		);
		var scaler = size * (Math.random() * 0.5 + 1);
		var shape = new CANNON.Sphere(radius * scaler);
		ballMesh.scale.multiplyScalar(scaler);
		shape.material = groundMaterial;
		var ballBody = new CANNON.Body({
			mass: 5 * Math.pow(scaler, 3), // kg 
			position: new CANNON.Vec3(x, y, z), // m 
			shape: shape,
			linearDamping: 0.6,
			angularDamping: 0.6,
		 	resistGravity: true,
			// fixedRotation: true,
			collisionFilterGroup: CollisionLayers.ITEMS,
			collisionFilterMask: CollisionLayers.ENVIRONMENT | CollisionLayers.PLAYER | CollisionLayers.ITEMS
		});
		ballBody.resistGravity = true;
		add({
			mesh: ballMesh,
			body: ballBody
		});
	}

	function weaponFireMakeBall(pos, playerSize) {
		makeBall(pos.x, pos.y, pos.z, playerSize);
	}

	// player.addTool({
	// 	primaryFire: weaponFireMakeBall
	// });

	add(new BallMaker(this, new CANNON.Vec3(-1, -1, 1)));


	// Start the simulation loop 
	var lastTime;
	(function simloop(time){
		requestAnimationFrame(simloop);
		if(lastTime !== undefined){
			 var dt = (time - lastTime) / 1000;
			 world.step(fixedTimeStep, dt, maxSubSteps);
		}
		objects.forEach(function(object) {
			if(object.onEnterFrame) object.onEnterFrame();
			if(object.onUpdateSim) object.onUpdateSim();
			object.mesh.position.copy(object.body.position);
			object.mesh.quaternion.copy(object.body.quaternion);
		});
		if(queueToRemove.length > 0) {
			for(var i = 0; i < queueToRemove.length; i++) {
				remove(queueToRemove[i][0], queueToRemove[i][1]);
			}
			queueToRemove.length = 0;
		}
		lastTime = time;
	})();

	this.world = world;

	this.add = add.bind(this);
	this.remove = requestRemove.bind(this);
	this.makeBall = makeBall.bind(this);
}

module.exports = WorldManager;