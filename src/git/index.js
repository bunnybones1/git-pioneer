var commitLookup = [];
var commits = [];
var limit = 200;
var gitRepoPath = "unavailable";
var spawn = require("child_process").spawn;

function stdInWrapper(uint8Arr) {
	if(limit > 0){
		limit--;
	} else {
		console.log("limit hit");
		return;
	}
	var dataString = String.fromCharCode.apply(null, uint8Arr);
	console.log("STDIN: " + dataString);
	return dataString;

}

function wrapStdIn(outputMethod) {
	return function wrappedStdIn(uint8Arr) {
		outputMethod.call(this, stdInWrapper(uint8Arr));
	};
}

function addNextCommand(command, commandArgs, commitHash) {
	if(!commandArgs) {
		commandArgs = [];
	}
	nextCommands.push({
		command: command,
		commandArgs: commandArgs,
		commitHash: commitHash
	});
}

function getCommit(hash) {
	if(!hash) return;
	var index = commitLookup.indexOf(hash);
	if(index == -1) {
		commitLookup.push(hash);
		var commit = {
			hash: hash,
			parents: [],
			children: []
		};
		if(graphicsApi) {
			graphicsApi.onCreateHash(commit);
		}
		commits.push(commit);
		return commit;
	} else {
		return commits[index];
	}
}

function addParent(commitHash, parentHash) {
	var commit = getCommit(commitHash);
	var parentCommit = getCommit(parentHash);
	if(!commit || !parentHash) return;

	var dirty = false;
	if(commit.parents.indexOf(parentHash) == -1) {
		commit.parents.push(parentHash);
		dirty = true;
	}
	if(parentCommit.children.indexOf(commitHash) == -1) {
		parentCommit.children.push(commitHash);
		dirty = true;
	}
	if(dirty && graphicsApi) {
		graphicsApi.onCreateHash(parentCommit);
		graphicsApi.onCreateHash(commit);
	}
}

function onHashDoFollowParents(dataString) {
	if(!dataString) return;
	var parentHashes = dataString.split(" ");
	console.log(dataString);
	var _this = this;
	parentHashes.forEach(function (parentHash) {
		if(commitLookup.indexOf(parentHash) != -1) return;
		addParent(_this.commitHash, parentHash);
		addNextCommand(commands.getParentsOfHash, [parentHash], parentHash);
	});
}

var commands = {
	getHeadHash: {
		commandTemplate: "cd %%GIT_REPO_PATH && git rev-parse HEAD",
		getCommand: function() { 
			return this.commandTemplate.replace("%%GIT_REPO_PATH", gitRepoPath);
		},
		onStdIn: wrapStdIn(onHashDoFollowParents)
	},
	getParentsOfHash: {
		commandTemplate: "cd %%GIT_REPO_PATH && git log --pretty=%P -n 1 %%COMMIT_HASH",
		getCommand: function(hash) { 
			var commandLine = this.commandTemplate.replace("%%GIT_REPO_PATH", gitRepoPath);
			commandLine = commandLine.replace("%%COMMIT_HASH", hash);
			return commandLine;
		},
		onStdIn: wrapStdIn(onHashDoFollowParents)
	}
};

var nextCommands = [];


function chooseFile(name) {
	var chooser = document.querySelector(name);
	chooser.addEventListener("change", function(evt) {
		console.log(this.value);
		initGitRepoPath(this.value);
		localStorage.repoPath = this.value;
	}, false);
	chooser.click();
}

if(localStorage.repoPath == null) {
	chooseFile("#fileDialog");
} else {
	initGitRepoPath(localStorage.repoPath);
}
function initGitRepoPath(_gitRepoPath) {
	gitRepoPath = _gitRepoPath;
	addNextCommand(commands.getHeadHash);
	runNextCommand();
}

function runNextCommand() {
	if(nextCommands.length == 0) return;
	var commandPack = nextCommands.shift();
	var command = commandPack.command;
	var commandLine = command.getCommand.apply(command, commandPack.commandArgs);
	var child = spawn(commandLine, [], {shell: true, detached: true});
	child.stdout.on("data", command.onStdIn.bind(commandPack));
	child.stderr.on("data", function(data) {
		console.log("stderr: " + data);
		//Here is where the error output goes
	});
	child.on("close", function(code) {
		// console.log("closing code: " + code);
		console.log(commitLookup.length + " commitLookup");
		runNextCommand();
		//Here you can get the exit code of the script
	});
}

var graphicsApi = null;

window.gitApiManager = {
	registerGraphics: function(graphics) {
		commits.forEach(graphics.onCreateHash);
		graphicsApi = graphics;
	}
};