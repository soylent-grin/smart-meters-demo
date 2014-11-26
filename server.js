var http = require('http');
var fs = require('fs');

var port = 3300;

http.createServer(function (req, res) {
	console.log('Requested URL: ' + req.url);
	if (req.url === '/') {
		fs.readFile('index.html', function(e, data) {
			res.writeHead(200);
			res.write(data);
			res.end();
		});
	} else {
		var url = req.url.substring(1);
		fs.readFile(url, function(e, data) {
			if (e) {
				res.writeHead(404, {"Content-Type": "text/html"});
				res.write('Not Found');
				console.log(url + " not found");
				res.end();
			} else {
				res.writeHead(200);
				res.write(data);
				res.end();
			}
		});
	}
}).listen(port);
console.log('Smart meters demo server is running on ' + port);