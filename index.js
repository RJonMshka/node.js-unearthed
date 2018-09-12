/*
* Primary File for API
*/

// Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');

// Declare the App
var app = {};

// Init Function
app.init = function(){
    // Start the server
    server.init();

    // Start the workers
    //workers.init();
};

// Execute 
app.init();


// Export the app
module.exports = app;
