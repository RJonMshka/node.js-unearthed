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
            var stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor , stringData , function (err) {
                if(!err){
                    fs.close(fileDescriptor , function (err){
                        if(!err) {
                            callback(false);
                        } else {
                            callback('Error in closing the file');
                        }
                    });
                } else{
                    callback('Error in writing file');
                }
            });


        } else {
            callback('Could not create a file, it may already exist');
        }
    });
}

// Read data from a file
lib.read = function (dir , file , callback) {
    fs.readFile (lib.baseDir + dir + '/' + file + '.json' , 'utf8' , function (err , data) {
        callback (err , data);
    });
}


// Update existing file with new data
lib.update = function (dir , file , data , callback) {
    // Open the file for writing
    fs.open(lib.baseDir + dir + '/' + file + '.json' , 'r+' , function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert data into string
            var stringData = JSON.stringify(data);

            fs.truncate (fileDescriptor , function (err) {
                if(!err) {
                    // Write to file and close it
                    fs.writeFile (fileDescriptor , stringData , function (err) {
                        if(!err) {
                            fs.close(fileDescriptor , function (err) {
                                if(!err) {
                                    callback(false);
                                } else {
                                    callback ('Error closing file');
                                }
                            });
                        } else {
                            callback ('error writing to existing file');
                        }
                    });
                } else {
                    callback ('error truncating file');
                }
            });
        } else {
            callback ('Could not update data, file may not exist');
        }
    });
}

// Deleting a file
lib.delete = function (dir , file , callback) {
    // Unlink the file
    fs.unlink (lib.baseDir + dir + '/' + file + '.json' , function (err) {
        if (!err) {
            callback (false);
        } else {
            callback ('Error deleting file');
        }
    });
}

// Export the module
module.exports = lib;