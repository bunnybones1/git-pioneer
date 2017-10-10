var three = require('three');
window.THREE = three;
var ManagedView = require('threejs-managed-view');
var urlparam = require('urlparam');
var colors = require('nice-color-palettes/500');
var TimerRing = require('./src/meshes/TimerRing');
var LabelFactory = require('./src/factories/LabelFactory');
var eases = require('eases');

var ColorPreviewGrid = require('./src/meshes/ColorPreviewGrid');
// var colorPalette = colors[49];
var colorPalette = colors[~~(colors.length * Math.random())];
colorPalette = colorPalette.map(function strToColor(colorStr) {
	return new three.Color(0, 0, 0);
});


if(urlparam('break', -1) === -1 || urlparam('work', -1) === -1) {
	window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname + '?work=15&break=5&black=false';
}
var durationBreakSession = urlparam('break', 5) * 60;
var durationWorkSession = urlparam('work', 15) * 60;



var workColorsIndex = urlparam('colorsWork', ~~(colors.length * Math.random()));
var workColors = colors[workColorsIndex];
console.log('colorsWork=' + workColorsIndex);
// var workColors = colors[499];
var breakColorsIndex = urlparam('colorsBreak', ~~(colors.length * Math.random()));
var breakColors = colors[breakColorsIndex];
console.log('colorsBreak=' + breakColorsIndex);
// var breakColors = colors[98];
function mapHexToColors(hex) {
	return new three.Color(hex);
}


colorPalette.unshift(colorPalette.splice(2, 1)[0]);
workColors.unshift(workColors.splice(2, 1)[0]);
breakColors.unshift(breakColors.splice(2, 1)[0]);

//projector mode looks best on black background
if(urlparam('black', false)) {
	colorPalette[0].setRGB(0, 0, 0);
	workColors[0] = 0x000000;
	breakColors[0] = 0x000000;
}

var scheduleChunk = [
	{
		label: 'WORK',
		durationMs: durationWorkSession * 1000,
		colors: workColors.map(mapHexToColors)
	},
	{
		label: 'BREAK',
		durationMs: durationBreakSession * 1000,
		colors: breakColors.map(mapHexToColors)
	}
];

var schedule = [];
var repeat = urlparam('repeat', 3);
for (var i = 0; i < repeat; i++) {
	schedule = schedule.concat(scheduleChunk);
}
var totalScheduleChunks = schedule.length;
var b = new three.Color(0, 0, 0);
schedule.unshift({
	label: 'WAIT',
	durationMs: 0,
	colors: [b, b, b, b, b]
});

var camera = new three.OrthographicCamera(100, -100, 100, -100, 100, -100);
var view = new ManagedView.View({
	rendererSettings: {
		// autoClear: false,
		// preserveDrawingBuffer: true
	},
	// stats:true,
	camera: camera
});

view.renderer.setClearColor(colorPalette[0], 1);

var RafTweener = require('raf-tweener');
var tweener = new RafTweener();
tweener.start();

var ringsData = [
	{
		durationMs: 10 * 1000,
		thickness: 0.005
	},
	{
		durationMs: 60 * 1000,
		thickness: 0.1
	},
	{
		durationMs: durationWorkSession * 60 * 1000,
		thickness: 0.5
	}
]

var offsetCursor = 0;
var timerRings = [];
for (var i = 0; i < ringsData.length; i++) {
	var ringData = ringsData[i];
	var timerRing = new TimerRing({
		color1: colorPalette[i+1],
		color2: colorPalette[i+2],
		durationMs: ringData.durationMs,
		thickness: ringData.thickness,
		offset: offsetCursor
	});
	offsetCursor += ringData.thickness;

	view.scene.add(timerRing);
	timerRings.push(timerRing);
}

var labelFactory = new LabelFactory();
var timeLabel;
var activityLabel;
labelFactory.createLabel('15:00', colorPalette[4], 32, function onTimeLabel(mesh) {
	timeLabel = mesh;
	mesh.material.uniforms.color.value = colorPalette[4];
	view.scene.add(mesh);
	onResize(window.innerWidth, window.innerHeight);
});

labelFactory.createLabel('WORK', colorPalette[3], 32, function onActivityLabel(mesh) {
	activityLabel = mesh;
	mesh.material.uniforms.color.value = colorPalette[3];
	view.scene.add(mesh);
	onResize(window.innerWidth, window.innerHeight);
});


var scheduleStrip = new three.Object3D();
var cursor = 0;
var scheduleStripSize = 0;
for (var i = 0; i < schedule.length; i++) {
	if(schedule[i].durationMs === 0) {
		continue;
	}
	var scheduleStripBlock = new three.Object3D();
	var sizes = [0.05, 0.25, 0.7];
	var cursor = 0;
	var colorHeight = 1 / schedule[i].colors.length;
	for (var j = 1; j < schedule[i].colors.length - 1; j++) {
		cursor += sizes[j-1] * 0.5;
		var geom = new three.PlaneBufferGeometry(1, 1, 1, 1);
		var color1 = new three.Color(schedule[i].colors[j]);
		var color2 = new three.Color(schedule[i].colors[j+1]);
		var colorArr = new Float32Array(12);
		color1.toArray(colorArr, 0);
		color2.toArray(colorArr, 3);
		color1.toArray(colorArr, 6);
		color2.toArray(colorArr, 9);
		// colorArr = colorArr.map(Math.random);
		geom.addAttribute('color', new three.BufferAttribute(colorArr, 3));
		var scheduleChunk = new three.Mesh(geom, new three.MeshBasicMaterial({
			// color: schedule[i].colors[4],
			vertexColors: three.VertexColors
		}));
		scheduleChunk.scale.y = sizes[j-1];
		scheduleChunk.position.y = 1-cursor;
		scheduleStripBlock.add(scheduleChunk);
		cursor += sizes[j-1] * 0.5;
	}
	scheduleStripBlock.position.x = scheduleStripSize + schedule[i].durationMs * 0.5;
	scheduleStripBlock.scale.x = schedule[i].durationMs;
	scheduleStripBlock.rotation.x = Math.PI;
	scheduleStripBlock.scale.y = 0.333;
	scheduleStrip.add(scheduleStripBlock);
	scheduleStripSize += schedule[i].durationMs;
}
view.scene.add(scheduleStrip);

// var colorPreview = new ColorPreviewGrid(colors);
// colorPreview.rotation.x = Math.PI;
// view.scene.add(colorPreview);
// view.renderManager.onEnterFrame.add(timerRing.onEnterFrame);

function onResize(w, h) {
	s = w < h ? w : h;
	// var sy = s * 1.25;
	s *= 0.9;
	var sy = s;

	for (var i = 0; i < timerRings.length; i++) {
		timerRings[i].position.set(w * 0.5, h * 0.5, 0);
		timerRings[i].scale.set(s, sy, s);
	}

	if(timeLabel) {
		timeLabel.scale.set(s * 0.0033, sy * 0.0033, s * 0.0033);
		timeLabel.position.set(w * 0.5, h * 0.5, 0);
	}
	if(activityLabel) {
		activityLabel.scale.set(s * 0.0013, sy * 0.0013, s * 0.0013);
		activityLabel.position.set(w * 0.5, h * 0.5 - s * 0.12, 0);
	}

	scheduleStrip.position.set(0, h, 0);
	scheduleStrip.scale.set(w / scheduleStripSize, s * 0.05, 10);

	// colorPreview.position.set(w * 0.5, h * 0.5, 0);
	// colorPreview.scale.set(s, s, s);
};

setTimeout(function () {
	onResize(window.innerWidth, window.innerHeight);
}, 100);

var lastTimeLabelString = '';
// var origin = new THREE.Vector3();
var tare = 0;
function onEnterFrame() {
	if(schedule.length === 0 || !activityLabel) {
		return;
	}
	var timeLeft = schedule[0].durationMs - (performance.now() - tare);
	if(timeLeft < 0) {
		tare += schedule[0].durationMs;
		schedule.shift();
		if(schedule.length === 0) return;
		activityLabel.geometry.update(schedule[0].label);
		activityLabel.geometry.recenter();
		timerRings[timerRings.length-1].durationMs = schedule[0].durationMs;
		for (var i = 0; i < colorPalette.length; i++) {
			function onUpdateBGColor() {
				view.renderer.setClearColor(colorPalette[0], 1);
			}
			tweener.to(colorPalette[i], 1, {
				r: schedule[0].colors[i].r,
				g: schedule[0].colors[i].g,
				b: schedule[0].colors[i].b,
				onUpdate: i === 0 ? onUpdateBGColor : undefined
			});
		}
		for (var i = 0; i < scheduleStrip.children.length; i++) {
			tweener.to(scheduleStrip.children[i].scale, 1, {
				y: ((totalScheduleChunks-i) === schedule.length) ? 1 : 0.33,
				ease: eases.quartInOut 
			});
		}
		return;
	}
	if(timeLabel) {
		var mins = ~~(timeLeft / 60 / 1000 + (schedule[0].durationMs / 1000 * 100000)) % (schedule[0].durationMs / 1000);
		var secs = ~~(timeLeft / 1000 + 60000) % 60;
		mins = mins.toString();
		secs = secs.toString();
		if(secs.length < 2) {
			secs = '0' + secs;
		}
		timeLabelString = mins + ':' + secs;
		if(timeLabelString !== lastTimeLabelString) {
			timeLabel.geometry.update(timeLabelString);
			timeLabel.geometry.recenter();
		}
	}

	for (var i = 0; i < timerRings.length-1; i++) {
		timerRings[i].onEnterFrame(performance.now());
	}
	var offset = schedule.length % 2 === 0 ? schedule[0].durationMs : 0;
	timerRings[timerRings.length-1].onEnterFrame((schedule[0].durationMs - timeLeft) + offset);
}

view.onResizeSignal.add(onResize);
view.renderManager.onEnterFrame.add(onEnterFrame);

view.renderManager.skipFrames = urlparam('skipFrames', 0);