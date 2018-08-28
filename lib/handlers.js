/*
*Request Handlers
* 
*/

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');

// Define Handlers
var handlers = {};

// Ping Handler
handlers.ping = function (data , callback) {
    callback(200);
}

// Users
handlers.users = function ( data , callback) {
    var acceptableMethods =  ['post'  ,'get' , 'put' , 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method]( data , callback); 
    } else {
        // Error code for unacceptable method
        callback (405);
    }       
}

// Container for user submethods
handlers._users = {};

// Users - post
// Required data: firstname , lastname , phone , password , tosAgreement
// Optional data: none  
handlers._users.post = function (data , callback) {
    // Check that all fields are filled     
    var firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
    var lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstname && lastname && phone && password && tosAgreement) {
        // Make sure that the user doesn't already exist
        _data.read ('users' , phone , function (err , data){
            if (err) {
                // Hash the password
                var hashedPassword = helpers.hash(password);

                if(hashedPassword) {
                    // Create a user object
                var userObject = {
                    'firstname' : firstname,
                    'lastname' : lastname,
                    'phone' : phone,
                    'hashedPassword' : hashedPassword,
                    'tosAgreement' : true
                };

                // Store the user
                _data.create('users' , phone , userObject , function(err) {
                    if(!err) {
                        callback(200);
                    } else {
                        console.log(err);
                        callback( 500 , {'Error' : 'Could not create the new user'});
                    }
                });
                } else {
                    callback(500 , {'Error' : 'Unable to hash user\'s password'})
                }
            } else {
                // User Already exists
                callback (400 , {'Error' : 'User with that number already exists'});
            }
        });
    } else {
        callback (400 , {'Error' : 'Missing required fields'});
    }
}

// Users - get
// Required data: phone
// Optional Data
// @TODO only let authenticated access their object, don't let them access anyone elses
handlers._users.get = function (data , callback) {
    // Check the phone no. is valid
    // Since GET request don't have a payload, we have to use parameters from queryStringObject
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone) {
        // Lookup the user
        _data.read('users' , phone , function (err , data) {
            if (!err && data) {
                // Remove the hashed pwd
                delete data.hashedPassword;
                callback (200 , data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400 , {'Error' : 'Missing required field'});
    }
}

// Users - put
// Required data : phone
// Optional Data: firstname , lastname , password (atleast one must be specified)
// @TODO Only authenticated users must be allowed to update, not anyone else's
handlers._users.put = function (data , callback) {
    // Check for required fields
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    // Check for optional fields
    var firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
    var lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // Error if phone is invalid
    if (phone) {
        // Check for optional fields
        if (firstname || lastname || password) {
            _data.read ('users' , phone , function (err , userData) {
                if (!err && userData) {
                    // Update the fields necessary
                    if(firstname) {
                        userData.firstname = firstname;
                    }
                    if(lastname) {
                        userData.lastname = lastname;
                    }
                    if(password) {
                        userData.password = helpers.hash(password);
                    }
                    // Store the new updated data
                    _data.update ('users' , phone , userData , function (err) {
                        if(!err) {
                            callback(200);  
                        }else {
                            console.log(err);
                            callback(500 , {'Error' : 'Could not update the user'});
                        }
                    });
                } else {
                    callback (400 , {'Error' : 'Specified user doesn\'t exist'});
                }
            });
        } else {
            callback (400 , {'Error' : 'Missing Optional Fields'})
        }
    } else {
        callback (400 , {'Error' : 'Missing required field'});
    }
}

// Users - delete
handlers._users.delete = function (data , callback) {
    
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

// Export the module
module.exports = handlers;