var simplebench = require("../index.js");

var args = process.argv.slice(2);
var fileName = args.shift();
var filePath = fileName.match(/^\//) ? fileName : process.cwd() + "/" + fileName;

var argTypes = {
	duration : Number,
	bounce : Boolean,
	bounceEvery : Number,
	compare : Boolean,
	save : Boolean,
	savePath : String,
	saveFilename : String
}

var pathBreakdown = filePath.match(/(.*)\/(.*)$/);

var suiteArgs = {
	savePath : pathBreakdown[1] + "/",
	saveFileRoot : pathBreakdown[2]
};

args.forEach(function(val) {
	var temp = val.match(/--(\w+)(=(.*))?/);
	var argName = temp[1];
	var argValue = temp[3];
	
	var type = argTypes[argName];
	if (type === undefined) { throw new Error("Invalid argument " + temp[1]); }
	
	suiteArgs[argName] = argValue === undefined ? true : type(argValue);
});

global.suite = new simplebench.Suite(suiteArgs);

require(filePath);

suite.run(function(err, results) {
	if (err) { throw err; }
	
	suite.report(results);
	
	if (suiteArgs.save === true) {
		suite.saveResults(results, function(err) {
			if (err) { throw err; }
			
			process.exit();
		});
	}
});