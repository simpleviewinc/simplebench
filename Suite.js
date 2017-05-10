"use strict";

var async = require("async");
var microtime = require("microtime");

var Suite = function(args) {
	var self = this;
	
	self._args = args || {};
	self._args.duration = self._args.duration || (1000 * 1000); // duration is in microseconds, default to 1 second
	self._args.bounceEvery = self._args.bounceEvery || 1000;
	self._args.bounce = self._args.bounce !== undefined ? self._args.bounce : false;
	
	self.tests = {};
}

Suite.prototype.add = function(name, fn) {
	var self = this;
	
	self.tests[name] = fn;
}

Suite.prototype.run = function(cb) {
	var self = this;
	
	async.mapValuesSeries(self.tests, function(test, key, cb) {
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
			winner : undefined,
			winnerCount : 0,
			results : []
		};
		
		for(var i in temp) {
			if (temp[i] > results.winnerCount) {
				results.winner = i;
				results.winnerCount = temp[i];
			}
		}
		
		for(var i in temp) {
			var val = temp[i];
			var diff = i === results.winner ? undefined : (val - results.winnerCount) / results.winnerCount * 100;
			
			results.results.push({
				name : i,
				count : val,
				diff : diff,
				diffString : diff ? `, diff: ${diff.toFixed(2)}%` : "",
				opsSec : val / (self._args.duration / 1000 / 1000)
			});
		}
		
		results.results = results.results.sort((a, b) => a.count < b.count);
		
		return cb(null, results);
	});
}

Suite.prototype.report = function(results) {
	var self = this;
	
	console.log(`Winner - ${results.winner}\n`);
	console.log("Results:");
	for(var value of results.results) {
		console.log(`${value.name} - count: ${value.count}, ops/sec: ${value.opsSec}${value.diffString}`);
	}
}

//// private
Suite.prototype._runTest = function(fn, cb) {
	var self = this;
	
	var count = 0;
	var start = microtime.now();
	
	var runCb = function() {
		var now = microtime.now();
		if (now - start > self._args.duration) {
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