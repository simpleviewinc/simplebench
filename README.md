[![Build Status](https://travis-ci.org/simpleviewinc/simplebench.svg?branch=master)](https://travis-ci.org/simpleviewinc/simplebench)

# simplebench
`npm install simplebench`

Tail call optimized benchmarking tool for async and sync javascript. This can be used for both asynchronous and synchronous performance testing. This library seeks to minimize test overhead ensuring that the proper result is seen. In other libraries the cost of doing the tests is muddied into the performance results making the results unreliable.

As of Node 7.10.0, in order to enable tail call optimization you will need to start your node file with `--harmony`. If you do not utilize "use strict" in your test file, you can also start with `--use-strict` to enable it process-wide.

The way `simplebench` operates is that it calls each test in your suite as many times as it can in a given duration. Each call is executed one after the other. If the call completes *after* the duration expires, it is not counted. From there we can determine ops/sec and compare the different tests to determine a winner. It is best to ensure that the duration is long enough that numerous iterations (>1000) are able to complete to ensure a reasonable sample size.

## Example

```js
// example.js
var simplebench = require("./index.js");

var arr = [1,2,3,4,5];
var suite = new simplebench.Suite();
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

suite.run(function(err, results) {
	if (err) { throw err; }
	
	suite.report(results);
});
```

```
// execute
: node --harmony --use-strict example.js
Winner - for

Results:
for - count: 2427560, ops/sec: 2427560
forEach - count: 1491169, ops/sec: 1491169, diff: -38.57%
```

# Documentation

## Suite

The suite is the primary mechanism you will use for creating comparison tests.

### Suite constructor(args)

Create a new test suite with specific arguments.

* duration - `number` - default `1000 * 1000` (1 second) - Duration in microseconds for each test in the suite to run. In example, for a test to run for 500ms, you will want to pass `500 * 1000`.
* bounce - `boolean` - default `false` - Whether to bounce off the event loop. For functions which are not TCO, if they do not bounce off the loop after X iterations, they can stack overflow. The preferred option is making it TCO. If that's not available, then you can enable bounce.
* bounceEvery - `number` - default `1000` - After X iterations it will bounce off the event loop. Needed when TCO cannot be utilized.

```js
var suite = new simplebench.Suite(); // default args
var suite = new simplebench.Suite({ bounce : true, bounceEvery : 100 }); // bounce off event loop every 100 iterations
var suite = new simplebench.Suite({ duration : 100 * 1000 }); // each test in the suite will run for 100ms
```

### Suite.prototype.add(name, cb)

Add a test to the suite. The same name can only occur in each suite once.

* name - `string` - The name of the test
* cb - `function` - A function which will receive a `done` function. Call it upon test completion.

### Suite.prototype.run(cb)

Run the test suite and determine the winner. 

* cb - `function` - A function which will receive `err`, `results`. The results object is commonly passed to `suite.report(results)`. It can also be manually reported on.

### Suite.prototype.report(results)

Used to output the results object in a human readable format.

* results - `object` - Output the results object.