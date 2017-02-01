//Lets require/import the HTTP module
var http = require('http');
var url = require('url') ;

var port = 8080; 

process.argv.forEach(function (val, index, array) {
  if (val.indexOf("port=") == 0) {
    port = parseInt(val.split("=")[1]);
  }
});

//We need a function which handles requests and send response
function handleRequest(request, response){
    console.log("request to: " + request.url);
    request.on('data', function (data) {
        var json = JSON.parse(data);
        console.log(json.temperature);
        console.log(json.humidity);
        console.log(json.sender);
        response.end("OK");
    });
}

var data = {};

//Create a server
var server = http.createServer(function(request, response) {
	var headers = request.headers;
 	var method = request.method;
  	var url = request.url;
  	var body = [];
	request.on('error', function(err) {
		console.error(err);
	}).on('data', function(chunk) {
		body.push(chunk);
	}).on('end', function() {
		body = Buffer.concat(body).toString();
		response.on('error', function(err) {
			console.error(err);
		});

		if (request.method === "GET") {
			if (request.url.indexOf("/get/") >= 0) {
				response.setHeader('Content-Type', 'application/json');
				var splittedUrl = request.url.split("/get/");
				response.end(JSON.stringify(data[splittedUrl[splittedUrl.length - 1]]));
			} else {
				response.statusCode = 400;
			}
		} else if (request.method === "POST" || request.method === "PUT") {
			response.statusCode = 200;
			try {
				var json = JSON.parse(body);
				if (json && json.sender) {
					data["" + json.sender] = {
						temperature: json.temperature,
						humidity: json.humidity
					};
				}
			} catch (e) {
				console.error(e);
			}
		} else {
			response.statusCode = 400;
		}

		response.end();
	});
});

//Lets start our server
server.listen(port, (error) => {
  if (error) {
    return console.log('something went wrong 1: ', error);
  }

  console.log(`server is listening on ${port}`);
});
