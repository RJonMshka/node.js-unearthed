/**
 * Library for storing and rotating logs
 * @author Rajat Kumar 
 * 
 */

//  Dependencies
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');


// Container for module
var lib = {};


// Base directory of logs folder
lib.baseDir = path.join(__dirname , '/../.logs/');

// Appending a string to a file. Create the file if it doesn't exist
lib.append = function(file , str , callback) {
    // Opening the file for appending
    // 'a' switch - append, create if not exist
    fs.open(lib.baseDir + file + '.log' , 'a' ,function (err, fileDesciptor){
        if(!err && fileDesciptor) {
            // Appending to file and close it
            fs.appendFile(fileDesciptor , str + '\n' , function(err){
                if(!err) {
                    fs.close(fileDesciptor , function(err){
                        if(!err) {
                            callback(false);
                        } else {
                            callback('Error closing the file that was being appended');
                        }
                    });
                } else {
                    callback('Error Appending to file');
                }
            });
        } else {
            callback('Could not open file for appending');
        }
    });
};




// Exporting the module
module.exports = lib;