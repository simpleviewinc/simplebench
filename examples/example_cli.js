// example.js
var arr = [1,2,3,4,5];
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