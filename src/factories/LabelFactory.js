var createGeometry = require('three-bmfont-text');
var MSDFShader = require('three-bmfont-text/shaders/msdf');
var loadFont = require('load-bmfont');
var three = require('three');


function LabelFactory(params) {
  if(__instance) {
    throw Exception("No need for multiple instances, just use LabelFactory.getInstance()");
  }
  this.queuedCreations = [];
  loadFont('fonts/Roboto-msdf.json', _onFontLoad.bind(this));
  __instance = this;
}

var __instance;
LabelFactory.getInstance = function getInstance() {
  if(!__instance) {
    __instance = new LabelFactory();
  }
  return __instance;
}

function _onFontLoad(err, font) {
  if(err) throw err;
  this.font = font;
  var textureLoader = new THREE.TextureLoader();
  textureLoader.load('fonts/Roboto-msdf.png', _onFontTextureLoad.bind(this));
}

function _onFontTextureLoad(texture) {
  this.texture = texture;
  this.createLabel = createLabel;
  _processQueuedCreates.call(this);
}

function _processQueuedCreates() {
  console.log('label factory is ready');
  while(this.queuedCreations.length > 0) {
    this.createLabel.apply(this, this.queuedCreations.pop());
  }
}

function queueCreateLabel(message, color, callback) {
  console.log('deferring label creation until factory is ready');
  this.queuedCreations.push(arguments);
}

function createLabel(message, color, align, width, callback) {
  var geometry = createGeometry({
    width: width || 300,
    align: align || 'center',
    font: this.font
  });

  geometry.update(message);
  geometry.recenter = recenterGeometry.bind(geometry, align);

  geometry.recenter();

  var material = new three.RawShaderMaterial(MSDFShader({
      map: this.texture,
      // side: THREE.DoubleSide,
      transparent: true,
      color: color
  }));

  var mesh = new THREE.Mesh(geometry, material);
  callback(mesh);
}

function recenterGeometry(align) {
  var minX = Infinity;
  var maxX = -Infinity;
  var minY = Infinity;
  var maxY = -Infinity;
  var vertPosArr = this.attributes.position.array;
  for (var i = 0; i < vertPosArr.length; i+=2) {
    minX = Math.min(minX, vertPosArr[i]);
    maxX = Math.max(maxX, vertPosArr[i]);
    minY = Math.min(minY, vertPosArr[i+1]);
    maxY = Math.max(maxY, vertPosArr[i+1]);
  }
  var alignFloat = 0.5;
  switch(align) {
    case "left":
      alignFloat = 0;
      break;
    case "right":
      alignFloat = 1;
      break;
  }
  var midX = (minX + maxX) * alignFloat;
  var midY = (minY + maxY) * 0.5;
  for (var i = 0; i < vertPosArr.length; i+=2) {
    vertPosArr[i] = vertPosArr[i] - midX;
    vertPosArr[i+1] = vertPosArr[i+1] - midY;
  }
  this.attributes.position.needsUpdate = true;
}

LabelFactory.prototype = {
  createLabel: queueCreateLabel
};

module.exports = LabelFactory;

