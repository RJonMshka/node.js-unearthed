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


// List all the logs, and optionally include the compressed logs
lib.list = function(includeCompressedLogsInList,callback) {
    fs.readdir(lib.baseDir , function(err , data) {
        if(!err && data && data.length > 0) {
            var trimmedFileNames = [];
            data.forEach(function(fileName){
                // Add .log files
                if(fileName.indexOf('.log')>-1) {
                    trimmedFileNames.push(fileName.replace('.log',''));
                }

                // Add on the .gz files to array
                if(fileName.indexOf('.gz')>-1 && includeCompressedLogsInList){
                    trimmedFileNames.push(fileName.replace('.gz.b64',''));
                }
            });
            callback(false,trimmedFileNames);
        } else {
            callback(err , data);
        }
    });
}

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logId, newFileId , callback) {
    var sourceFile = logId + '.log';
    var destFile = newFileId + '.gz.b64';

    // Read the source file
    fs.readFile(lib.baseDir + sourceFile,'utf8',function(err , inputString){
        if(!err && inputString) {
            // Compress the data using gzip
            // gzip comes with zlib library
            zlib.gzip(inputString , function(err, buffer) {
                if(!err && buffer) {
                    // Send the data to the destination file
                    fs.open(lib.baseDir + destFile, 'wx' ,function(err , fileDesciptor){
                        if(!err && fileDesciptor) {
                            // Write to destintion file
                            fs.writeFile(fileDesciptor,buffer.toString('base64'),function(err){
                                if(!err) {
                                    // Closing the destination file
                                    fs.close(fileDesciptor,function(err) {
                                        if(!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
            
        } else {
            callback(err);
        }
    });
}


// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function(fileId , callback) {
    var fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir + fileName, 'utf8' , function(err,str) {
        if(!err && str) {
            // Decompress the data
            var inputBuffer = Buffer.from(str , 'base64');
            zlib.unzip(inputBuffer , function(err , outputBuffer){
                if(!err && outputBuffer) {
                    // Callback
                    var str = outputBuffer.toString();
                    callback(false , str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
}

// Truncating a log file
lib.truncate = function(logId , callback) {
    fs.truncate(lib.baseDir+logId+'.log',0,function(err){
        if(!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
}


// Exporting the module
module.exports = lib;