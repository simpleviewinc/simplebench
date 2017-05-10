"use strict";

var simplebench = require("../index.js");
var microtime = require("microtime");
var assert = require("assert");

describe(__filename, function() {
	it("should init and run", function(done) {
		var suite = new simplebench.Suite({ duration : 100 * 1000 });
		suite.add("test1", function(done) {
			var start = Date.now();
			while(Date.now() - start < 10) {}
			
			return done();
		});
		
		suite.add("test2", function(done) {
			var start = Date.now();
			while(Date.now() - start < 5) {}
			
			return done();
		});
		
		suite.run(function(err, results) {
			assert.ifError(err);
			
			assert.strictEqual(results.winner, "test2");
			assert.ok(results.winnerCount >= 18 && results.winnerCount <= 22);
			assert.strictEqual(results.results[0].diff, undefined);
			assert.ok(results.results[0].opsSec >= 190 && results.results[0].opsSec <= 210);
			assert.ok(results.results[1].diff >= -55 && results.results[1].diff <= -45);
			assert.ok(results.results[1].opsSec >= 90 && results.results[1].opsSec <= 110);
			
			done();
		});
	});
	
	it("should run with only one test", function(done) {
		var suite = new simplebench.Suite();
		suite.add("test1", function(done) {
			setTimeout(function() {
				return done();
			}, 10);
		});
		
		suite.run(function(err, results) {
			assert.ifError(err);
			
			assert.strictEqual(results.winner, "test1");
			assert.ok(results.winnerCount >= 90 && results.winnerCount <= 110);
			
			done();
		});
	});
	
	it("should work with tail call optimization", function(done) {
		// without TCO, this will exceed max callstack because of the number of calls that it will execute
		var suite = new simplebench.Suite();
		suite.add("test1", function(done) {
			return done();
		});
		
		suite.run(function(err, results) {
			assert.ifError(err);
			
			done();
		});
	});
	
	it("microtime comparable to process.hrtime", function(done) {
		var suite = new simplebench.Suite({ duration : 500 * 1000 });
		suite.add("microtime", function(done) {
			var temp = microtime.now();
			return done();
		});
		
		suite.add("hrtime", function(done) {
			var temp = process.hrtime();
			return done();
		});
		
		suite.run(function(err, results) {
			assert.ifError(err);
			
			assert.ok(results.results[1].diff >= -15);
			
			done();
		});
	});
	
	it("array loop constructs", function(done) {
		var arr = [1,2,3,4];
		var suite = new simplebench.Suite({ duration : 100 * 1000 });
		suite.add("forEach", function(done) {
			arr.forEach(function(val) {});
			
			return done();
		});
		
		suite.add("forEach arrow", function(done) {
			arr.forEach(val => {});
			
			return done();
		});
		
		var fn = () => {}
		suite.add("forEach no fn declaration", function(done) {
			arr.forEach(fn);
			
			return done();
		});
		
		suite.add("for of", function(done) {
			for(var val of arr) {}
			
			return done();
		});
		
		suite.add("for", function(done) {
			for(var i = 0; i < arr.length; i++) {
				var val = arr[i];
			}
			
			return done();
		});
		
		suite.run(function(err, results) {
			assert.ifError(err);
			
			assert.strictEqual(results.winner, "for");
			
			done();
		});
	});
});