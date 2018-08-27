// Libraries for storing and editing data

// Dependencies
var fs = require('fs');
var path = require('path');

// Container for the module (to be exported)
var lib = {};

// Basic directory of the data folder
lib.baseDir = path.join(__dirname , '/../.data/');  

// Write data to a file
lib.create = function (dir , file , data , callback) {
    // Open the file for writing
    fs.open(lib.baseDir + dir + '/' + file +'.json', 'wx' , function (err , fileDescriptor){
        if(!err && fileDescriptor){
            // Convert data to string
        } else {
            callback('Could not create a file, it may already exist');
        }
    });
}


// Export the module
module.exports = lib;