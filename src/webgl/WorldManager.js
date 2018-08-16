var three = require("three");
var CheckerboardTexture = require("threejs-texture-checkerboard");
var cannon = require("cannon");
var urlParam = require("urlparam");

var effects = require("gameObjects/effects");

var geomLib = require("geometry/lib");
var CollisionLayers = require("CollisionLayers");

function WorldManager(canvas, camera, inputManager, renderer) {
	var scene = new three.Scene();
	var fog = new three.Fog( 0x7f7f7f, camera.near, camera.far);
	var physicsDebugScene = new three.Scene();
	physicsDebugScene.name = "debugPhysics" + Math.random();

	scene.fog = fog;

	var p = (1 + ~~(Math.random() * 4));
	var planeMaterial = new three.MeshPhongMaterial({
		map: new CheckerboardTexture(0x6f4f3f, 0x7f5f4f, 1000 / p, 1000 / p)
	});
	var plane = new three.Mesh(
		new three.PlaneGeometry(1000, 1000, 1, 1),
		planeMaterial
	);

	scene.add(plane);

	var physics = new cannon.World();
	physics.gravity.set(0, 0, -16);
	physics.gravity.w = 0.4;
	physics.broadphase = new cannon.NaiveBroadphase();
	physics.solver.iterations = 10;

	var objects = [];

	var ambient = new three.HemisphereLight(0x7fafcf, 0x6f4f3f, 1); 
	ambient.position.set(0, 0, 100);
	scene.add(ambient);

	var groundBody = new cannon.Body({
		mass: 0, // mass == 0 makes the body static
		collisionFilterGroup: CollisionLayers.ENVIRONMENT,
		collisionFilterMask: CollisionLayers.PLAYER | CollisionLayers.ITEMS | CollisionLayers.PORTALS
	});
	var groundShape = new cannon.Plane();

	var groundMaterial = new cannon.Material();
	groundMaterial.friction = 0.9;

	groundShape.material = groundMaterial;
	groundBody.addShape(groundShape);
	physics.addBody(groundBody);

	function add(object) {
		scene.add(object.mesh);
		if(object.body) {
			physics.addBody(object.body);
			var color = new three.Color();
			color.setHSL(Math.random(), 1, 0.8);
			object.body.shapes.forEach(shape => {
				if(!shape.debugMesh) {
					var geom = geomLib.sphereHelper(1, 16);
					var mat = new three.LineBasicMaterial({
						color: color
					});
					var mesh = new three.Line(geom, mat);
					mesh.matrixAutoUpdate = false;
					shape.debugMesh = mesh;
				}
				physicsDebugScene.add(shape.debugMesh);
			});
		}
		objects.push(object);
	}
	var queueToRemove = [];
	function requestRemove(object, callback, immediate = false) {
		if(immediate) {
			remove(object, callback);
		} else {
			queueToRemove.push([object, callback]);
		}
	}
	function requestDestroy(object, callback) {
		if(object && object.body) {
			var shapes = object.body.shapes;
			for(var i = 0; i < shapes.length; i++) {
				var shape = shapes[i];
				if(shape.radius > 0) {
					makeHitEffect(object.body.pointToWorldFrame(object.body.shapeOffsets[i]), shape.radius, 0.5);
				}
			}
		}
		requestRemove(object, callback);
	}
	function remove(object, callback) {
		scene.remove(object.mesh);
		if(object.body) {
			object.body.shapes.forEach(shape => {
				physicsDebugScene.remove(shape.debugMesh);
			});

			physics.removeBody(object.body);
		}
		var index = objects.indexOf(object);
		if(index != -1) {
			objects.splice(index, 1);
		}
		if(callback) callback();
	}


	var fixedTimeStep = 1.0 / 60.0; // seconds 
	var maxSubSteps = 3;
	
	var radius = 0.5; // m 
	var geometry = geomLib.sphere(radius, 32, 16);

	var material = new three.MeshPhongMaterial({
		color: 0xffffff,
		map: new CheckerboardTexture()
	});

	function makeBall(pos, size, vel, enviro = false) {
		var ballMesh = new three.Mesh(
			geometry,
			material
		);
		var scaler = size * (Math.random() * 0.5 + 1);
		var shape = new cannon.Sphere(radius * scaler);
		ballMesh.scale.multiplyScalar(scaler);
		shape.material = groundMaterial;
		var ballBody = new cannon.Body({
			mass: 5 * Math.pow(scaler, 3), // kg 
			position: pos, // m 
			velocity: vel, // m 
			type: enviro ? cannon.Body.STATIC : cannon.Body.DYNAMIC,
			shape: shape,
			linearDamping: 0.6,
			angularDamping: 0.6,
			// fixedRotation: true,
			collisionFilterGroup: enviro ? CollisionLayers.ENVIRONMENT : CollisionLayers.ITEMS,
			collisionFilterMask: CollisionLayers.ENVIRONMENT | CollisionLayers.PLAYER | CollisionLayers.ITEMS
		});
		ballBody.resistGravity = true;
		var ball = {
			mesh: ballMesh,
			body: ballBody
		};
		ballBody.interactiveObject = ball;
		add(ball);
		return ball;
	}

	function makeHitEffect(pos, size, duration) {
		var hit = new effects.EnergyBubblePop(pos, size, duration, remove);
		add(hit);
	}

	// userHead.addTool({
	// 	primaryFireStart: weaponFireMakeBall
	// });

	// Start the simulation loop 
	var lastTimePhysics;
	var timeScalePhysics;
	function simulatePhysics(time){
		var i;
		if(lastTimePhysics === undefined){
			lastTimePhysics = time;
		}
		var dt = (time - lastTimePhysics) * 0.001;
		timeScalePhysics = Math.min(1 / ((1/60) / dt), 10);
		if(dt > 0) {
			for(i = 0; i < objects.length; i++) {
				var object = objects[i];
				if(object.onUpdateSim) object.onUpdateSim(timeScalePhysics);
			}
			physics.step(fixedTimeStep, dt, maxSubSteps);
		}
		if(queueToRemove.length > 0) {
			for(i = 0; i < queueToRemove.length; i++) {
				remove(queueToRemove[i][0], queueToRemove[i][1]);
			}
			queueToRemove.length = 0;
		}
		lastTimePhysics = time;
	}

	var lastTimeEnterFrame;
	var timeScaleEnterFrame;
	function onEnterFrame(time) {
		if(lastTimePhysics === undefined){
			lastTimePhysics = time;
		}
		var dt = (time - lastTimeEnterFrame) * 0.001;
		timeScaleEnterFrame = Math.min(1 / ((1/60) / dt), 10);
		if(dt > 0) {
			for(var i = 0; i < objects.length; i++) {
				var object = objects[i];
				if(object.body) {
					object.mesh.position.copy(object.body.position);
					object.mesh.quaternion.copy(object.body.quaternion);
				}
				if(object.onEnterFrame) object.onEnterFrame(timeScaleEnterFrame);
			}
		}
		lastTimeEnterFrame = time;
	}

	var size = new three.Vector3(1, 1, 1);
	var debugPhysics = urlParam("debugPhysics", false);
	function onExitFrame() {
		if(!debugPhysics) return;
		physics.bodies.forEach(body => {
			body.shapes.forEach((shape, i) => {
				if(shape.debugMesh) {
					var r = shape.radius;
					size.set(r, r, r);
					shape.debugMesh.matrix.compose(body.position.toThree(), body.quaternion.toThree(), size);
					var offsetMatrix = new three.Matrix4();
					var offset = body.shapeOffsets[i];
					offsetMatrix.makeTranslation(offset.x, offset.y, offset.z);
					shape.debugMesh.matrix.multiply(offsetMatrix);
				}
			});
		});
		renderer.render(physicsDebugScene, camera);
	}

	
	this.physics = physics;
	this.scene = scene;


	this.add = add.bind(this);
	this.remove = requestRemove.bind(this);
	this.destroy = requestDestroy.bind(this);
	this.makeBall = makeBall.bind(this);
	this.makeHitEffect = makeHitEffect.bind(this);
	this.onEnterFrame = onEnterFrame.bind(this);
	this.simulatePhysics = simulatePhysics.bind(this);
	this.onExitFrame = onExitFrame.bind(this);
}

module.exports = WorldManager;