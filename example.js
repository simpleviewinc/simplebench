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