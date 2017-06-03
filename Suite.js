"use strict";

var async = require("async");
var moment = require("moment");
var fs = require("fs");
var os = require("os");

var Suite = function(args) {
	var self = this;
	
	self._now = moment();
	
	self._args = args || {};
	self._args.duration = (self._args.duration || (1000)) * 1000; // duration in milliseconds, converted to microseconds
	self._args.bounce = self._args.bounce !== undefined ? self._args.bounce : false;
	self._args.bounceEvery = self._args.bounceEvery || 1000;
	self._args.compare = self._args.compare !== undefined ? self._args.compare : false;
	self._args.save = self._args.save !== undefined ? self._args.save : false;
	self._args.savePath = self._args.savePath !== undefined ? self._args.savePath : process.cwd() + "/";
	self._args.saveFileRoot = self._args.saveFileRoot !== undefined ? self._args.saveFileRoot : "simplebench";
	self._args.saveFilename = self._args.saveFilename !== undefined ? self._args.saveFilename : `${self._args.saveFileRoot}.${self._now.format("YYYY-MM-DD-X")}.json`;
	self._args.logArgs = self._args.logArgs !== undefined ? self._args.logArgs : false;
	
	if (self._args.logArgs) {
		console.log("Using args", self._args);
	}
	
	self._groups = {
		default : {
			tests : {}
		}
	};
	
	self.skip = {
		add : function() {},
		group : function() {}
	}
}

Suite.prototype.group = function(name, fn) {
	var self = this;
	
	if (self._group !== undefined) { throw new Error("Cannot nest a group within a group"); }
	
	self._groups[name] = self._group = {
		tests : {}
	}
	
	fn();
	
	self._group = undefined;
}

Suite.prototype.add = function(name, fn) {
	var self = this;
	
	var group = self._group !== undefined ? self._group : self._groups.default;
	
	group.tests[name] = fn;
}

Suite.prototype.run = function(cb) {
	var self = this;
	
	if (Object.keys(self._groups).length > 1 && Object.keys(self._groups.default.tests).length > 0) {
		throw new Error("If using suite.group(), all tests must be within a group");
	}
	
	for(var i in self._groups) {
		if (Object.keys(self._groups[i].tests).length === 0) {
			delete self._groups[i];
		}
	}
	
	async.mapValuesSeries(self._groups, function(group, name, cb) {
		return self._runGroup(group, cb);
	}, function(err, groupResults) {
		if (err) { return cb(err); }
		
		var results = {
			suiteArgs : self._args,
			date : self._now.format("LLLL"),
			os : {
				cpus : os.cpus(),
				totalmem : os.totalmem(),
			},
			process : {
				version : process.version,
				versions : process.versions
			}
		}
		
		results.groups = groupResults;
		
		cb(null, results);
	});
}

Suite.prototype._runGroup = function(group, cb) {
	var self = this;
	
	async.mapValuesSeries(group.tests, function(test, key, cb) {
		self._runTest(test, function(err, data) {
			if (err) { return cb(err); }
			
			// bounce off the event loop to allow some garbage collection from the last test
			setTimeout(function() {
				cb(null, data);
			}, 100);
		});
	}, function(err, temp) {
		if (err) { return cb(err); }
		
		
		var results = {
			results : []
		}
		
		if (self._args.compare === true) {
			results.winner = undefined;
			results.winnerCount = 0;
			
			for(var i in temp) {
				if (temp[i] > results.winnerCount) {
					results.winner = i;
					results.winnerCount = temp[i];
				}
			}
		}
		
		for(var i in temp) {
			var val = temp[i];
			var diff = i === results.winner ? undefined : (val - results.winnerCount) / results.winnerCount * 100;
			
			results.results.push({
				name : i,
				count : val,
				diff : self._args.compare === true ? diff : undefined,
				diffString : self._args.compare === true && diff ? `, diff: ${diff.toFixed(2)}%` : "",
				opsSec : val / (self._args.duration / 1000 / 1000)
			});
		}
		
		results.results = results.results.sort((a, b) => a.count < b.count);
		
		return cb(null, results);
	});
}

Suite.prototype.report = function(results) {
	var self = this;
	
	for(var groupName in results.groups) {
		var group = results.groups[groupName];
		
		console.log("Group: ", groupName);
		
		if (self._args.compare) {
			console.log(`Winner - ${group.winner}\n`);
		}
		
		for(var value of group.results) {
			console.log(`${value.name} - count: ${value.count}, ops/sec: ${value.opsSec}${value.diffString}`);
		}
	}
}

Suite.prototype.saveResults = function(results, cb) {
	var self = this;
	
	return fs.writeFile(`${self._args.savePath}${self._args.saveFilename}`, JSON.stringify(results, null, "\t"), cb);
}

// return microsecond difference between two hrtimes
var _diffHrtime = function(hrtime) {
	var diff = process.hrtime(hrtime);
	return (diff[0] * 1000000) + (diff[1] / 1000);
}

//// private
Suite.prototype._runTest = function(fn, cb) {
	var self = this;
	
	var count = 0;
	var start = process.hrtime();
	
	var runCb = function() {
		var diff = _diffHrtime(start);
		if (diff > self._args.duration) {
			return cb(null, count);
		}
		
		count++;
		if (self._args.bounce === true && count % self._args.bounceEvery === 0) {
			// to ensure high performance we don't want to bounce every execution, so only bounce if enabled
			return setImmediate(run);
		} else {
			return run();
		}
	}
	
	var run = function() {
		return fn(runCb);
	}
	
	return run();
}

module.exports = Suite;