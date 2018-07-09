var three = require('three');
window.THREE = three;
var ManagedView = require('threejs-managed-view');
var urlparam = require('urlparam');
var colors = require('nice-color-palettes/500');
var CommitCircle = require('./src/meshes/CommitCircle');
var LabelFactory = require('./src/factories/LabelFactory');
var eases = require('eases');


var overallScale = 0.4;


var camera = new three.PerspectiveCamera(60);
// var camera = new three.OrthographicCamera(100, -100, 100, -100, 100, -100);
var view = new ManagedView.View({
	rendererSettings: {
		// autoClear: false,
		// preserveDrawingBuffer: true
	},
	// stats:true,
	camera: camera
});

view.renderer.setClearColor(0x000000, 1);

var RafTweener = require('raf-tweener');
var tweener = new RafTweener();
tweener.start();

var labelFactory = LabelFactory.getInstance();

var nodeSpacing = 40 * overallScale;

function onResize(w, h) {
	s = w < h ? w : h;
	// var sy = s * 1.25;
	s *= 0.9;
	var sy = s;

	cursor = new THREE.Vector3(w * 0.5, h * 0.05, 0);
	if(commitCircles.length > 0) {
		commitCircles[0].position.copy(cursor);
	}
	for(var i = 1; i < commitCircles.length; i++) {
		placeCommitCircle(commitCircles[i]);
	}

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
	// for (var i = 0; i < commitCircles.length-1; i++) {
	// 	commitCircles[i].onEnterFrame(performance.now());
	// }
}

view.onResizeSignal.add(onResize);
view.renderManager.onEnterFrame.add(onEnterFrame);

view.renderManager.skipFrames = urlparam('skipFrames', 30);

var test = false;
var _workingPosition = new three.Vector3();
function placeCommitCircle(commitCircle, skipParents = false) {
	_workingPosition.set(0, 0, 0);
	if(!skipParents) {
		commitCircle.commit.parents.forEach(function(pCom) {
			var pComCirc = commitCircles[commitHashes.indexOf(pCom)];
			// placeCommitCircle(pComCirc, true);
		});
	}
	var commit = commitCircle.commit;
	if(commit.children.length > 0) {
		commit.children.forEach(function(childHash) {
			var childIndex = commitHashes.indexOf(childHash);
			if(childIndex != -1) {
				_workingPosition.add(commitCircles[childIndex].position);
			}
		});
		_workingPosition.multiplyScalar(1 / commit.children.length);
	}
	commitCircle.position.copy(_workingPosition);
	commitCircle.position.y += nodeSpacing;
	if(commit.children.length > 0) {
		var childIndex = commitHashes.indexOf(commit.children[0]);
		if(childIndex != -1) {
			var childCommit = commits[childIndex];
			var parentIndex = childCommit.parents.indexOf(commit.hash);
			commitCircle.position.x += (Math.random() - 0.5) * 5 + nodeSpacing * (parentIndex - (childCommit.parents.length - 1) * 0.5) * 4;
			// commitCircle.color1.copy(commitCircles[childIndex].color1);
			if(parentIndex == 0) {
				commitCircle.color1.copy(commitCircles[childIndex].color1);
			}
		}
		// commitCircle.position.x += nodeSpacing * commit.parents.indexOf(parentCommit.hash);
	}
}

var commits = [];
var commitHashes = [];
var commitCircles = [];
var graphicsInterface = {
	onCreateHash: function(commit) {
		var index = commitHashes.indexOf(commit.hash);
		var commitCircle;
		if(index == -1) {
			var color = new THREE.Color(colors[~~(Math.random()*colors.length)][3]);
			commitCircle = new CommitCircle({
				color1: color,
				commit: commit,
				fontScale: 0.02,
				thickness: 0.5
			});
			commitCircle.scale.multiplyScalar(20 * overallScale);
			view.scene.add(commitCircle);
			commits.push(commit);
			commitHashes.push(commit.hash);
			commitCircles.push(commitCircle);
		} else {
			commitCircle = commitCircles[index];
		}
		placeCommitCircle(commitCircle);
		if(commitCircles.length == 2) {
			onResize(window.innerWidth, window.innerHeight);
		}
	},
	onDestroyHash: function(hash) {
		debugger;
	}
}
window.gitApiManager.registerGraphics(graphicsInterface);
