var __geometry;
var pointOnSphere = require("utils/math/point-on-sphere-fibonacci");
var SphereGeometry = require("geometry/SphereSimplicialFibonacci");
var three = require("three");

function __getGeometry() {
	if(!__geometry) {
		__geometry = new SphereGeometry(0.5, 100, true);
	}
	return __geometry;
}
var __types = [];
var __materials = [];

function hashCode(s){
	return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a;},0);              
}
function __getMaterial(type) {
	if(__types.indexOf(type) === -1) {
		__types.push(type);
	}
	var depth = __types.indexOf(type);
	if(!__materials[depth]) {
		var color = new three.Color();
		// color.setHSL((depth/24)%1, 1, 0.75);
		color.setHSL((hashCode(type)/24)%1, 1, ((hashCode(type)/47)%1) * 0.4 + 0.45);
		__materials[depth] = new three.MeshPhongMaterial({
			// wireframe: true,
			morphTargets: true,
			color: color,
			side: three.BackSide
			// depthTest: false,
			// depthWrite: false,
			// transparent: true
		});
	}
	return __materials[depth];
}

function GitVisualizer(app) {
	this.app = app;
	this.registered = [];
	this.meshes = [];
	this.rootMeshes = [];
	this.multiParented = 0;
	this.attempts = 0;
	this.orphans = 0;
	this.addNode = this.addNode.bind(this);
}

var nextThresh = 10000;
GitVisualizer.prototype.addNode = function(node, parentNode){
	this.attempts++;
	if(this.attempts > nextThresh) {
		nextThresh *= 1.25;
		window.document.title = ("nodes: " + this.attempts + "...");
		console.log("attempted", this.attempts, "still working...");
	}
	if(this.registered.indexOf(node) !== -1) {
		this.multiParented++;
		return;
	} else {
		this.registered.push(node);
	}
	var depth;
	var parentIndex = this.registered.indexOf(parentNode);
	var parentMesh = this.meshes[parentIndex];
	if(parentMesh) {
		depth = parentMesh.depth + 1;
	} else {
		depth = 0;
	}
	var mesh = new three.Mesh(__getGeometry(), __getMaterial(node.type));
	mesh.morphTargetInfluences[0] = 0;
	var attachPoint = new three.Object3D();
	attachPoint.position.y = 1;
	mesh.add(attachPoint);
	mesh.attachPoint = attachPoint;
	mesh.depth = depth;
	this.meshes.push(mesh);
	mesh.scale.multiplyScalar(0.8);
	if(parentMesh) {
		var parentAttach = parentMesh.attachPoint;
		parentAttach.add(mesh);
		var siblings = parentAttach.children;
		siblings.forEach(function(child, i) {
			var longLat = pointOnSphere(i, siblings.length*6);
			child.rotation.y = longLat[0];
			child.rotation.z = longLat[1] + Math.PI * 0.5;
		});
		if(siblings.length > 1) {
			parentAttach.rotation.y = Math.PI * 0.5;
		}
		var scaleAdjust = Math.sqrt(siblings.length) / 5 * 20;
		siblings.forEach(function(child) {
			child.scale.y = scaleAdjust * 0.8;
			child.attachPoint.scale.y = 1/scaleAdjust;
			child.morphTargetInfluences[0] = 1 - 1 / scaleAdjust;
		});
	} else {
		this.rootMeshes.push(mesh);
		mesh.depth = 0;
		this.orphans++;
	}
};

GitVisualizer.prototype.merge = function() {
	var materials = [];
	var childrenPerMaterials = [];
	var nodes = 0;
	var merged = 0;
	this.rootMeshes.forEach(function(root) {
		root.traverse(function(child) {
			child.updateMatrix();
			child.updateMatrixWorld();
			if(!child.material) return;
			nodes++;
			var index = materials.indexOf(child.material);
			if(index === -1) {
				index = materials.length;
				materials.push(child.material);
				childrenPerMaterials.push([]);
			}
			childrenPerMaterials[index].push(child);
		});
	});
	// debugger;
	window.document.title = "merging " + nodes + " nodes";
	var mergedMeshes = [];
	var chunkLimit = Math.pow(2, 16);
	var meshesInNextChunk = [];
	var accumulatedPositionSize;
	var accumulatedFaceSize;
	childrenPerMaterials.forEach(function(meshGroup, index){
		function resetGeometry() {
			meshesInNextChunk.length = 0;
			accumulatedPositionSize = 0;
			accumulatedFaceSize = 0;

		}
		function finalizeGeometry() {
			if(meshesInNextChunk.length === 0) return;
			var geometry = new three.BufferGeometry();
			var indicesBufferArray = new Uint16Array(accumulatedFaceSize * 3);
			var positionBufferArray = new Float32Array(accumulatedPositionSize * 3);
			var normalBufferArray = new Float32Array(accumulatedPositionSize * 3);
			var bufferPositionCursor = 0;
			var bufferFaceCursor = 0;
			var faceOffset = 0;
			var tempVert = new three.Vector3();
			meshesInNextChunk.forEach(function(subMesh) {
				var normals = new Array(subMesh.geometry.vertices.length);
				for (var i = subMesh.geometry.vertices.length - 1; i >= 0; i--) {
					normals[i] = [];
				}
				subMesh.geometry.faces.forEach(function(face) {
					normals[face.a].push(face.vertexNormals[0]);
					normals[face.b].push(face.vertexNormals[1]);
					normals[face.c].push(face.vertexNormals[2]);
				});

				normals = normals.map(function(many) {
					if(many.length === 0) {
						throw new Error("How can there be zero normals for this index?");
					}
					var one = new three.Vector3();
					for (var i = 0; i < many.length; i++) {
						one.add(many[i]);
					}
					one.multiplyScalar(1 / many.length);
					return one;
				});
				var morphVertices = subMesh.geometry.morphTargets[0].vertices;
				subMesh.geometry.vertices.forEach(function(vert, vertIndex) {
					tempVert.copy(vert);
					tempVert.lerp(morphVertices[vertIndex], subMesh.morphTargetInfluences[0]);
					tempVert.applyMatrix4(subMesh.matrixWorld);
					tempVert.toArray(positionBufferArray, bufferPositionCursor);

					tempVert.copy(normals[vertIndex]);
					tempVert.transformDirection(subMesh.matrixWorld);
					tempVert.toArray(normalBufferArray, bufferPositionCursor);

					bufferPositionCursor += 3;
				});

				subMesh.geometry.faces.forEach(function(face) {
					indicesBufferArray[bufferFaceCursor] = face.a + faceOffset;
					indicesBufferArray[bufferFaceCursor+1] = face.b + faceOffset;
					indicesBufferArray[bufferFaceCursor+2] = face.c + faceOffset;
					bufferFaceCursor += 3;
				});

				faceOffset += subMesh.geometry.vertices.length;
			});
			geometry.addAttribute("position", new three.BufferAttribute(positionBufferArray, 3));
			geometry.addAttribute("normal", new three.BufferAttribute(normalBufferArray, 3));
			geometry.addAttribute("index", new three.BufferAttribute(indicesBufferArray, 1));
			mergedMeshes.push(new three.Mesh(geometry, materials[index]));
			resetGeometry();
		}
		resetGeometry();
		while(meshGroup.length > 0) {
			var nextMesh = meshGroup.shift();
			merged++;
			window.document.title = "merging " + (merged / nodes * 100).toFixed(1) + "%";
			var meshPostionSize = nextMesh.geometry.vertices.length;
			if(accumulatedPositionSize + meshPostionSize > chunkLimit) {
				finalizeGeometry();
			} else {
				accumulatedPositionSize += meshPostionSize;
				accumulatedFaceSize += nextMesh.geometry.faces.length;
			}
			meshesInNextChunk.push(nextMesh);
		}
		finalizeGeometry();
	});
	this.rootMeshes = mergedMeshes;
};

GitVisualizer.prototype.test = function(total){
	var rootObj = new three.Object3D();
	for (var i = 0; i < total; i++) {
		var mesh = new three.Mesh(__getGeometry(), __getMaterial("normal"));
		rootObj.add(mesh);
		var longLat = pointOnSphere(i, total*6);
		mesh.rotation.y = longLat[0];
		mesh.rotation.z = longLat[1] + Math.PI * 0.5;
	}
	rootObj.scale.multiplyScalar(3);
	rootObj.position.z = 3;
	rootObj.rotation.x = Math.PI * 0.5;
	return rootObj;
};

module.exports = GitVisualizer;