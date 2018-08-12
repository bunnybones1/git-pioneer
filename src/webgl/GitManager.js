var Signal = require("signals").Signal;

function TreeBuilder(app) {
	this.app = app;
	this.crawlRepo = this.crawlRepo.bind(this);
	this.onNodeSignal = new Signal();
	this.onCompleteSignal = new Signal();
}

TreeBuilder.prototype.crawlRepo = function(){
	this.onNodeSignal.dispatch();
	this.onCompleteSignal.dispatch();
};

module.exports = TreeBuilder;