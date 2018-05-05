var three = require('three');
var defaults = require('lodash.defaults');
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
	durationMs: 1000,
	color1: new three.Color(0xff0000),
	color2: new three.Color(0xffff00),
	thickness: 0.5,
	offset: 0,
	bias: 1
}

function TimerRing(params) {
	params = defaults(params, __defaultParams);
	this.color1 = params.color1,
	this.color2 = params.color2,
	this.durationMs = params.durationMs;

	var uniforms = {
		progress: { value: 0.5 },
		thickness: { value: params.thickness },
		offset: { value: params.offset },
		bias: { value: params.bias },
		color: { value: this.color1.clone() }
	}

	var material = new three.ShaderMaterial({
		vertexShader: glslify('../shaders/ring.vsh'),
		fragmentShader: glslify('../shaders/basicColor.fsh'),
		uniforms: uniforms,
		// wireframe: true
	});

	three.Mesh.call(this, __getSharedGeometry(), material);
}

TimerRing.prototype = Object.create(three.Mesh.prototype);

TimerRing.prototype.onEnterFrame = onEnterFrame;

function onEnterFrame(time) {
	var amt = (time / this.durationMs) % 2;
	this.material.uniforms.progress.value = amt;
	this.material.uniforms.color.value.set(this.color1).lerp(this.color2, 1 - Math.abs(amt-1));

}

module.exports = TimerRing;