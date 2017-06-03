"use strict";

var simplebench = require("../index.js");
var assert = require("assert");
var child_process = require("child_process");

describe(__filename, function() {
	it("should init and run", function(done) {
		var suite = new simplebench.Suite({ duration : 100, compare : true });
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
			
			results = results.groups.default;
			
			assert.strictEqual(results.winner, "test2");
			assert.ok(results.winnerCount >= 18 && results.winnerCount <= 22, results.winnerCount);
			assert.strictEqual(results.results[0].diff, undefined);
			assert.ok(results.results[0].opsSec >= 180 && results.results[0].opsSec <= 220, results.results[0].opsSec);
			assert.ok(results.results[1].diff >= -60 && results.results[1].diff <= -40, results.results[1].diff);
			assert.ok(results.results[1].opsSec >= 90 && results.results[1].opsSec <= 110, results.results[1].opsSec);
			
			done();
		});
	});
	
	it("should run with only one test", function(done) {
		var suite = new simplebench.Suite({ compare : true });
		suite.add("test1", function(done) {
			setTimeout(function() {
				return done();
			}, 10);
		});
		
		suite.run(function(err, results) {
			assert.ifError(err);
			
			results = results.groups.default;
			
			assert.strictEqual(results.winner, "test1");
			assert.ok(results.winnerCount >= 90 && results.winnerCount <= 110, results.winnerCount);
			
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
	
	it("array loop constructs", function(done) {
		var arr = [1,2,3,4];
		var suite = new simplebench.Suite({ duration : 100, compare : true });
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
			
			results = results.groups.default;
			
			assert.strictEqual(results.winner, "for");
			
			done();
		});
	});
	
	it("should allow groups", function(done) {
		var arr = [1,2,3,4];
		
		var arrLarge = [];
		for(var i = 0; i < 10000; i++) {
			arrLarge.push(i);
		}
		
		var suite = new simplebench.Suite({ duration : 100, compare : true });
		suite.group("small", function() {
			suite.add("forEach", function(done) {
				arr.forEach(function(val) {});
				
				return done();
			});
			
			suite.add("for", function(done) {
				for(var i = 0; i < arr.length; i++) {
					var val = arr[i];
				}
				
				return done();
			});
		});
		
		suite.group("large", function() {
			suite.add("forEach", function(done) {
				arrLarge.forEach(function(val) {});
				
				return done();
			});
			
			suite.add("for", function(done) {
				for(var i = 0; i < arrLarge.length; i++) {
					var val = arrLarge[i];
				}
				
				return done();
			});
		});
		
		suite.run(function(err, results) {
			assert.ifError(err);
			
			assert.deepStrictEqual(Object.keys(results.groups), ["small", "large"]);
			assert.strictEqual(results.groups.small.winner, "for");
			assert.strictEqual(results.groups.large.winner, "for");
			
			return done();
		});
	});
	
	it("should allow skip", function(done) {
		var suite = new simplebench.Suite({ duration : 100 });
		suite.add("test1", function(done) {
			return done();
		});
		
		suite.skip.add("test2", function(done) {
			throw new Error("not called");
		});
		
		suite.run(function(err, results) {
			assert.ifError(err)
			
			assert.strictEqual(results.groups.default.results.length, 1);
			
			return done();
		});
	});
	
	it("should throw if mixing groups and not groups", function(done) {
		var suite = new simplebench.Suite();
		
		suite.add("test1", function(done) {
			throw new Error("invalid");
		});
		
		suite.group("foo", function() {
			suite.add("test2", function(done) {
				throw new Error("invalid");
			});
		});
		
		assert.throws(function() {
			suite.run(done);
		}, /If using suite\.group\(\), all tests must be within a group/);
		
		return done();
	});
	
	it("should throw if nesting a group in a group", function(done) {
		var suite = new simplebench.Suite();
		suite.group("foo", function() {
			assert.throws(function() {
				suite.group("bar", function() {});
			}, /Cannot nest a group within a group/);
			
			return done();
		});
	});
	
	describe("cli", function() {
		var pathTests = [
			{
				path : "./_cli_test.js",
			},
			{
				path : __dirname + "/_cli_test.js"
			},
			{
				path : "_cli_test.js"
			}
		];
		
		pathTests.forEach(function(test) {
			it(test.path, function(done) {
				var child_process = require("child_process");
				
				child_process.exec(`${__dirname}/../bin/simplebench ${test.path} --compare --duration=100`, { cwd : __dirname }, function(err, stdout, stderr) {
					assert.ifError(err);
					
					assert.ok(stdout.replace(/\s+/g, " ").match(/Group: default Winner - for for - count: \d+, ops\/sec: \d+ forEach - count: \d+, ops\/sec: \d+, diff: -\d+.\d+%/));
					
					return done();
				});
			});
		});
	});
});