var Pointers = require('input-unified-pointers');

function InputManager(app) {
  var pointers = new Pointers(app.viewManager.canvas);

  this.pointers = pointers;
}

module.exports = InputManager;