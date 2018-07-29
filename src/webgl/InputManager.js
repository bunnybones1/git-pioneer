var Pointers = require('input-unified-pointers');

function InputManager(canvas) {
  var pointers = new Pointers(canvas);

  this.pointers = pointers;
}

module.exports = InputManager;