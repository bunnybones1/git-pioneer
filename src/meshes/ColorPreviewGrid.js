var three = require('three');

var __sharedGeometry;
function __getSharedGeometry() {
	if(!__sharedGeometry) {
		__sharedGeometry = new three.PlaneBufferGeometry(1, 1, 1, 1);
	}
	return __sharedGeometry;
}


function ColorPreviewGrid(colors) {
	three.Object3D.call(this);
	// var cols = Math.ceil(Math.sqrt(colors.length));
	var cols = 20;
	var rows = Math.ceil(colors.length / cols);
	var w = 1 / cols * 0.9;
	var h = 1 / rows * 0.9;
	for (var i = 0; i < colors.length; i++) {
		var strip = new ColorStrip(colors[i]);
		strip.scale.set(w, h, 1);
		var col = i % cols;
		var row = ~~(i / cols);
		strip.position.set(col / cols - 0.5, -(row / rows - 0.5), 0);
		this.add(strip);
	}
}

ColorPreviewGrid.prototype = Object.create(three.Object3D.prototype);


function ColorStrip(colors) {
	three.Object3D.call(this);

	var w = 1 / colors.length;
	for (var i = 0; i < colors.length; i++) {
		var material = new three.MeshBasicMaterial({
			color: colors[i]
			// wireframe: true
		});
		var colorMesh = new three.Mesh(__getSharedGeometry(), material);
		colorMesh.scale.set(w, 1, 1);
		colorMesh.position.set(i * w - 0.5, 0, 0);
		this.add(colorMesh);
	}
}

ColorStrip.prototype = Object.create(three.Object3D.prototype);

module.exports = ColorPreviewGrid;