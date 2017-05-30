[![Build Status](https://travis-ci.org/simpleviewinc/simplebench.svg?branch=master)](https://travis-ci.org/simpleviewinc/simplebench)

# simplebench
`npm install simplebench`

`simplebench` is a tail call optimized benchmarking tool for asynchronous and synchronous microbenchmarking. This library seeks to minimize test overhead ensuring that the proper result is seen. In other libraries the cost of doing the tests is muddied into the performance results making the results unreliable.

The way `simplebench` operates is that it calls each test in your suite as many times as it can in a given duration. Each call is executed one after the other. If the call completes *after* the duration expires, it is not counted. From there we can determine ops/sec and compare the different tests to determine a winner. It is best to ensure that the duration is long enough that numerous iterations (>1000) are able to complete to ensure a reasonable sample size.

```js
// /examples/example_cli.js
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
```

```
: ./bin/simplebench ./examples/example_cli.js
for - count: 2391635, ops/sec: 2391635
forEach - count: 1477829, ops/sec: 1477829

: ./bin/simplebench ./examples/example_cli.js --compare
Winner - for

for - count: 2381534, ops/sec: 2381534
forEach - count: 1510180, ops/sec: 1510180, diff: -36.59%
```

## Command Line Interface

The easiest way to use simplebench is via the cli similar to Mocha. Create a suite file, execute it.

You can pass arguments to the cli that match 1 to 1 to the arguments of the `Suite` constructor. See the constructor documentation below for the available options.

Generally there are two types of test files you will run. One is a comparison of multiple ways of doing the same task, such as `for` vs `forEach` vs `for in`. The other is snapshot where you are simply benchmarking certain functions and how long they take today. Usually used when comparing the same functions to a time in the future with a different Node version, or after optimizations have been made.

```
# run a comparison benchmark
simplebench example.js --compare

# run a bunchmark, don't compare, save results. Used sometimes when comparing different Node versions or saving benchmarks for comparison to future versions of code.
simplebench example.js --save

# run a benchmmark, compare and save
simplebench example.js --save --compare
```

## As a node package

If you are using `simplebench` as a Node package, simply require it in and follow the steps below.

```js
// ./examples/example_node.js
var simplebench = require("../index.js"); // change this path to "simplebench" for your usecase

var arr = [1,2,3,4,5];
var suite = new simplebench.Suite({ compare : true });
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
: node --harmony --harmony_tailcalls --use_strict ./examples/example_node.js
Winner - for

Results:
for - count: 2427560, ops/sec: 2427560
forEach - count: 1491169, ops/sec: 1491169, diff: -38.57%
```

As of Node 7.10.0, in order to enable tail call optimization you will need to start your node file with `--harmony` and as of Node 8.0.0, you will need to also use `--harmony_tailcalls`. If you do not utilize "use strict" in your test file, you can also start with `--use_strict` to enable it process-wide. If both settings are not exampled, it will not be possible to utilize TCO and you may need to use the Suite argument `bounce` to avoid max call stack.

```
// execute
: node --harmony --harmony_tailcalls --use_strict example.js
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
* compare - `boolean` - default `false` - Compare the results from the different tests.
* save - `boolean` - default `false` - Save the results of the test to a file when utilized from the CLI
* savePath - `string` - default `process.cwd()` - The root path to save test files to. Defaults to the current working directory.
* saveFileRoot - `string` - The filename used for creating the timestamped save file. It defaults to the name of the benchmark file or "simplebench" if nothing is passed.
* saveFilename - `string` - The full name of the file to save. By default it will be `saveFileRoot` + (timestamp).json.
* logArgs - `boolean` - The constructor will output the args are it's interpretting them. Used if curious how it's interpretting command line arguments.

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
