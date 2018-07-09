var three = require('three');
var defaults = require('lodash.defaults');
var LabelFactory = require('../factories/LabelFactory');
var glslify = require('glslify');

var __sharedGeometry;
function __getSharedGeometry() {
	if(!__sharedGeometry) {
		var ringPlaneGeom = new three.PlaneBufferGeometry(1, 1, 128, 1);
		var posArr = ringPlaneGeom.attributes.position.array;
		for (var i = 0; i < posArr.length; i+=3) {
			posArr[i] += 0.5;
			posArr[i+1] = posArr[i+1] * 0.5 + 0.25;
		}

		__sharedGeometry = ringPlaneGeom;
	}
	return __sharedGeometry;
}

var __defaultParams = {
	commit: null,
	fontScale: 0.25,
	color1: new three.Color(0xff00ff),
	thickness: 0.05,
	offset: 0,
	bias: 1
}

function CommitCircle(params) {
	params = defaults(params, __defaultParams);
	this.color1 = params.color1;
	this.commit = params.commit;

	var uniforms = {
		progress: { value: 1.0 },
		thickness: { value: params.thickness },
		offset: { value: params.offset },
		bias: { value: params.bias },
		color: { value: this.color1 }
	}

	var material = new three.ShaderMaterial({
		vertexShader: glslify('../shaders/ring.vsh'),
		fragmentShader: glslify('../shaders/basicColor.fsh'),
		uniforms: uniforms,
		// wireframe: true
	});

	three.Mesh.call(this, __getSharedGeometry(), material);
	material.uniforms.color.value = this.color1;

	var _this = this;
	LabelFactory.getInstance().createLabel(params.commit.hash.substr(0, 8), params.color1, 'left', 1000, function(label) {
		label.scale.multiplyScalar(params.fontScale);
		label.position.x += 0.65;
		_this.add(label);
	});

	this.vel = new THREE.Vector3();
}

CommitCircle.prototype = Object.create(three.Mesh.prototype);

// CommitCircle.prototype.onEnterFrame = onEnterFrame;

// function onEnterFrame(time) {
// 	this.vel.multiplyScalar(0.999);
// 	this.vel.x += (Math.random() - 0.5) * 0.1;
// 	this.vel.y += (Math.random() - 0.5) * 0.1;
// 	// var amt = 1;
// 	// this.material.uniforms.progress.value = amt;
// 	this.position.add(this.vel);
// }

module.exports = CommitCircle;