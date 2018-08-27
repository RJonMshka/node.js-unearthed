/*
* Primary File for API
*/

// Dependencies
var http = require('http');
var https = require('https');
var url =  require('url');
var stringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var _data = require('./lib/data');


// TESTING
// @TODO delete this
_data.delete('test' , 'newFile' , function(err) {
    if (err) 
        console.log('error is ',err);
    else 
        console.log('NO ERROR DELETING... FILE DELETED');
}); 



// Instantiate the HTTP server
var httpServer = http.createServer(function(req , res){
    unifiedServer(req , res);
});

// Start the HTTP server
httpServer.listen(config.httpPort , function(){
    console.log('Server is listening on Port '+ config.httpPort +' in '+ config.envName+ ' mode!');
});

// Instantiate the HTTPS server
var httpsServerOptions =  {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert' : fs.readFileSync('./https/cert.pem')
};
var httpsServer = https.createServer(httpsServerOptions , function(req , res){
    unifiedServer(req , res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort , function(){
    console.log('Server is listening on Port '+ config.httpsPort +' in '+ config.envName+ ' mode!');
});


// All the server logic for unified http and https createServer
var unifiedServer = function (req , res) {
    // Get the URL and parse it
    var parsedUrl = url.parse(req.url , true);

    /* Get the path from URL */
    // This is untrimmed path
    var path = parsedUrl.pathname;
    // Trimmed path is
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // Get the query string object
    var queryStringobject = parsedUrl.query; 

    // Get the HTTP Method
    var method = req.method.toLowerCase();

    // Get th headers as object
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new stringDecoder('utf-8');
    var buffer = '';

    req.on('data' , function (data){
        buffer += decoder.write(data);
    });

    req.on('end' , function() {
        buffer += decoder.end();

        // Choose the request this handler would go to. If one is not found,  use the notFound handler
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Construct the data object to send to the handler
        var data = {
            'trimmedPath' : trimmedPath,
            'queryStringobject' : queryStringobject,
            'method' : method,
            'headers' : headers,
            'payload' : buffer
        };

        // Route the request to chosen handler
        chosenHandler(data ,  function (statusCode , payload) {
            // Use the status code called by handler, default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload defined by handler, or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert payload to String
            payloadString = JSON.stringify(payload);

            // Return the response
            res.setHeader('Content-Type','application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            // Log the request response
            console.log('Returning the response:', statusCode , payloadString);
        }); 
    });
};

// Define Handlers
var handlers = {};

// Ping Handler
handlers.ping = function (data , callback) {
    callback(200);
}

// // Sample Handler
// handlers.sample = function (data , callback) {
//     // Callback a HTTP status code, and a payload object
//     callback(406 , {'name' : 'sample handler'});
// };

// Not Found Handler
handlers.notFound = function (data , callback) {
    callback(404);
};

// Defining a request router
var router = {
    'ping': handlers.ping
};