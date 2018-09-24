/*
* Server related Tasks
*
*/


// Dependencies
var http = require('http');
var https = require('https');
var url =  require('url');
var stringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers'); 
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');


// Instantiate the server module object
var server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function(req , res){
    server.unifiedServer(req , res);
});


// Instantiate the HTTPS server
server.httpsServerOptions =  {
    'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions , function(req , res){
    server.unifiedServer(req , res);
});


// All the server logic for unified http and https createServer
server.unifiedServer = function (req , res) {
    // Get the URL and parse it
    var parsedUrl = url.parse(req.url , true);

    /* Get the path from URL */
    // This is untrimmed path
    var path = parsedUrl.pathname;
    // Trimmed path is
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // Get the query string object
    var queryStringObject = parsedUrl.query; 

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
        var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // Construct the data object to send to the handler
        var data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer)
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

            // If the status code is 200, print green otherwise red
            if(statusCode == 200){
                debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
            } else {
                debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
            }
        }); 
    });
};

// Defining a request router
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};


// Init Script
server.init = function(){
    // Start the HTTP server
    server.httpServer.listen(config.httpPort , function(){
        console.log('\x1b[36m%s\x1b[0m','Server is listening on Port '+ config.httpPort +' in '+ config.envName+ ' mode!');
    });

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort , function(){
        console.log('\x1b[35m%s\x1b[0m','Server is listening on Port '+ config.httpsPort +' in '+ config.envName+ ' mode!');
    });
    
}; 


// Export the server module
module.exports = server;