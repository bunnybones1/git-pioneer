THREE = require('three');

var ViewManager = require('./ViewManager');
var InputManager = require('./InputManager');
var WorldManager = require('./WorldManager');
var WidgetFactory = require('./WidgetFactory');
var GitManager = require('./GitManager');
var GitVisualizer = require('./GitVisualizer');
var CodePreviewer = require('./CodePreviewer');



function GraphGarden() {
	var _this = this;
	this.viewManager = new ViewManager(this);

	this.inputManager = new InputManager(this);

	this.worldManager = new WorldManager(this);

	this.widgetFctory = new WidgetFactory();
	// this.worldManager.addRelativeToPlayer(this.widgetFctory.makeThing());

	// this.gitManager = new GitManager(this);

	// this.gitVisualizer = new GitVisualizer(this);

	// this.gitManager.onNodeSignal.add(this.gitVisualizer.addNode);
}

module.exports = GraphGarden;