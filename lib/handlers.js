/*
*Request Handlers
* 
*/

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

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
handlers._users.get = function (data , callback) {
    // Check the phone no. is valid
    // Since GET request don't have a payload, we have to use parameters from queryStringObject
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone) {
        // Lookup the user
        // Get token from header
        var token = typeof(data.headers.token)== 'string' ? data.headers.token : false;
        // Verify the token
        handlers._tokens.verifyToken(token , phone , function(tokenIsValid) {
            if(tokenIsValid) {
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
                callback(403 , {'Error': 'Missing required Token in header or token is invalid'});
            }
        });
    } else {
        callback(400 , {'Error' : 'Missing required field'});
    }
}

// Users - put
// Required data : phone
// Optional Data: firstname , lastname , password (atleast one must be specified)
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
        // Get token from header
        var token = typeof(data.headers.token)== 'string' ? data.headers.token : false;
        // Verify the token
        handlers._tokens.verifyToken(token , phone , function(tokenIsValid) {
            if(tokenIsValid) {
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
                            userData.hashedPassword = helpers.hash(password);
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
                callback(403 , {'Error': 'Missing required Token in header or token is invalid'})
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
// Required data: phone
handlers._users.delete = function (data , callback) {
    // Check that the phone number is invalid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone) {
        // Lookup the user
        // Get token from headers
        var token = typeof(data.headers.token)== 'string' ? data.headers.token : false;
        // Verify the token
        handlers._tokens.verifyToken(token , phone , function(tokenIsValid) {
            if(tokenIsValid) {
                _data.read('users' , phone , function (err , userData) {
                    if (!err && data) {
                        // Delete the data
                        _data.delete( 'users' , phone , function(err) {
                            if(!err) {
                                // Delete all the checks associated with user
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                var checksToDelete = userChecks.length;
                                if(checksToDelete > 0) {
                                    var checksDeleted = 0;
                                    var deletionErrors = false;
                                    // Loop through checks
                                    userChecks.forEach(function(checkId){
                                        // Delete the check
                                        _data.delete('checks' , checkId , function(err){
                                            if(err) {
                                                deletionErrors = true;
                                            } 
                                            checksDeleted++;
                                            if(checksDeleted == checksToDelete) {
                                                if(!deletionErrors) {
                                                    callback(200);
                                                } else {
                                                    callback(500 , {'Error':'Errors encountered while attempting to delete user\'s all checks. All checks may not have been deleted successfully'});
                                                }
                                            }
                                        });
                                    });
                                } else {
                                    callback(200);
                                }
                            } else { 
                                callback (500 , {'Error' : 'Could not delete the specified user'});  
                            }
                        });
                    } else {
                        callback(400 , {'Error' : 'Could not find the specified user'});
                    }
                });
            } else {
                callback(403 , {'Error': 'Missing required Token in header or token is invalid'});
            }
        });
    } else {
        callback(400 , {'Error' : 'Missing required field'});
    }
}



// tokens
handlers.tokens = function ( data , callback) {
    var acceptableMethods =  ['post'  ,'get' , 'put' , 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method]( data , callback); 
    } else {
        // Error code for unacceptable method
        callback (405);
    }       
}

// Container for all the token methods
handlers._tokens = {};

// tokens - post
// Required data : phone , Pwd
// Optional data: none
handlers._tokens.post = function (data , callback) {

    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password) {
        // Lookup for user who matches the phone number
        _data.read('users' , phone ,  function(err , userData){
            if(!err && userData) {
                // Hash the sent password, compare it with stored one
                var hashedPassword = helpers.hash(password);
                if (hashedPassword === userData.hashedPassword) {
                    //If valid create a token with a random name. Set expiration date 1 hour in future 
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000*60*60;
                    var tokenObject = {
                        'phone': phone,
                        'id':tokenId,
                        'expires':expires
                    }

                    // Store the token
                    _data.create('tokens' , tokenId , tokenObject , function(err) {
                        if(!err) {
                            callback(200 , tokenObject);
                        } else {
                            callback(500 , {'Error': 'Could not create the new token'});
                        }
                    });
                } else {
                    callback(400 , {'Error': 'Password did not match'});
                }
            } else {
                callback(400 , {'Error': 'Could not find the requested user'});
            }
        });
    } else {
        callback(400 , {'Error' : 'Missing required field(s)'} );
    }
}

// tokens - get
// Required data : id
// optional data : none
handlers._tokens.get = function (data , callback) {
    // get the ID from queryparams
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ? data.queryStringObject.id.trim() : false;
    if(id) {
        // Lookup the token 
        _data.read('tokens' , id ,function(err , tokenData) {
            if(!err && tokenData) {
                callback(200 , tokenData);
            } else {
                callback (404);
            }
        });
    } else {
        callback(400 , {'Error': 'Missing Required fields'});
    }
}

// tokens - put
// Required data : id , extend (PUT req in this case doesn't mean anyhting , except if we want to extend the expiration preiod of token for the user)
// optional data : none
handlers._tokens.put = function (data , callback) {
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 19 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend)  == 'boolean' && data.payload.extend == true ? data.payload.extend : false;
    if(id && extend) {
        // Lookup the token
        _data.read('tokens',  id , function (err , tokenData) {
            if(!err && tokenData) {
                // Check if token isn't already expired
                if(tokenData.expires > Date.now()) {
                    // Set the expiration from hour from now
                    tokenData.expires =  Date.now() + 1000*60*60;

                    // Store the new update
                    _data.update('tokens',id,tokenData, function(err) {
                        if(!err) {
                            callback(200);
                        } else{
                            callback(500 , {'Error':'Could not update token\'s expiration time'});
                        }
                    });
                } else {
                    callback (400 , {'Error':'Token already expired, cannot be extended'});
                }

            } else {
                callback(400 , {'Error':'Specified token does not exist'});
            }
        });
    } else {
        callback(400 , {'Error': 'Missing required Field(s)'});
    }

}

// tokens - delete
// Required data: id
// Optional data: none (Logging Out)
handlers._tokens.delete = function (data , callback) {
    // Check that the token id is invalid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ? data.queryStringObject.id.trim() : false;
    if(id) {
        // Lookup the user
        _data.read('tokens' , id , function (err , tokenData) {
            if (!err && tokenData) {
                // Delete the tokenData
                _data.delete( 'tokens' , id , function(err) {
                    if(!err) {
                        callback(200);
                    } else { 
                        callback (500 , {'Error' : 'Could not delete the specified user\'s token'});  
                    }   
                });
            } else {
                callback(400 , {'Error' : 'Could not find the specified token'});
            }
        });
    } else {
        callback(400 , {'Error' : 'Missing required field'});
    }
}


// Verify if given id is currently valid for a given user
handlers._tokens.verifyToken = function (id , phone , callback) {
    // Lookup the token
    _data.read('tokens' , id , function(err , tokenData){
        if(!err && tokenData) {
            // Check the token for given user has expired or not
            if(tokenData.phone == phone && tokenData.expires > Date.now()) {    
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
}


// Checks
handlers.checks = function ( data , callback) {
    var acceptableMethods =  ['post'  ,'get' , 'put' , 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method]( data , callback); 
    } else {
        // Error code for unacceptable method
        callback (405);
    }       
}

// Container for all checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// optional data: none
handlers._checks.post = function(data , callback) {
    // Validate all the inputs
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string'  && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <=5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from headers
        var token = typeof(data.headers.token)== 'string' ? data.headers.token : false;

        // Lookup the user from token data
        _data.read('tokens' , token , function (err , tokenData){
            if(!err && tokenData) {
                var userPhone = tokenData.phone;

                // Lookup the user data
                _data.read('users' , userPhone , function(err , userData){
                    if(!err && userData) {
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify that the user has checks less than max-number-of-checks-per-user
                        if(userChecks.length <  config.maxChecks) {
                            // Create a random ID for checks
                            var checkId = helpers.createRandomString(20);

                            // Create the check object, and include user's phone
                            var checkObject = {
                                'id' : checkId,
                                'userPhone' : userPhone,
                                'protocol': protocol,
                                'url': url,
                                'method':method,
                                'successCodes': successCodes,
                                'timeoutSeconds': timeoutSeconds
                            };

                            // Save the object
                            _data.create('checks' , checkId , checkObject , function(err) {
                                if(!err) {
                                    // Add the checkId to userObject
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new user data
                                    _data.update('users' , userPhone , userData , function(err){
                                        if(!err) {
                                            // Return the data about new check
                                            callback(200 , checkObject);
                                        } else {
                                            callback(500 , {'Error':'Could not update the user with new check'});
                                        }
                                    });
                                } else {
                                    callback(500 , {'Error':'Could not create new check'});
                                }
                            });

                        } else {
                            callback(400 , {'Error': 'User already has maximum number of checks('+config.maxChecks+')'});
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });

    } else {
        callback(400 , {'Error': ',Missing fields, or inputs are invalid'});
    }

}


// checks - get
// Required data: Id
// Optional data : none
handlers._checks.get = function (data , callback) {
    // Check the id is valid
    // Since GET request don't have a payload, we have to use parameters from queryStringObject
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ? data.queryStringObject.id.trim() : false;
    if(id) {
        // Lookup the check
        _data.read('checks' , id , function(err , checkData){
            if(!err && checkData) {
                // Get token from header
                var token = typeof(data.headers.token)== 'string' ? data.headers.token : false;
                // Verify the token for the user who created the check
                handlers._tokens.verifyToken(token , checkData.userPhone , function(tokenIsValid) {
                    if(tokenIsValid) {
                        callback(200 , checkData);      
                    } else {
                        callback(403 , {'Error': 'Missing required Token in header or token is invalid'});
                    }
                });
            } else {
                callback(404);
            }
        });
        
    } else {
        callback(400 , {'Error' : 'Missing required field'});
    }
}


// checks - put
// Required data: id
// optional data: protocol, url, method, successCodes, timeoutSeconds (atleast one)
handlers._checks.put = function(data , callback) {
    // Check for required fields
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 19 ? data.payload.id.trim() : false;

    // Check for optional fields
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string'  && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <=5 ? data.payload.timeoutSeconds : false;

    if(id) {
        if(protocol || url || method || successCodes ||timeoutSeconds) {
            // Lookup the check
            _data.read('checks' , id , function (err , checkData){
                if(!err && checkData) {
                    // Get the token
                    var token = typeof(data.headers.token)== 'string' ? data.headers.token : false;
                     // Verify the token for the user who created the check
                    handlers._tokens.verifyToken(token , checkData.userPhone , function(tokenIsValid) {
                        if(tokenIsValid) {
                            // Update the check where necessary
                            if(protocol) {
                                checkData.protocol = protocol;
                            }
                            if(url) {
                                checkData.url = url;
                            }
                            if(method) {
                                checkData.method = method;
                            }
                            if(successCodes) {
                                checkData.successCodes = successCodes;
                            }
                            if(timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Store the new data
                            _data.update('checks' , id , checkData , function(err){
                                if(!err) {
                                    callback(200);
                                } else {
                                    // 500 for our fault.
                                    callback(500 , {'Error':'Could not update the check'})
                                }
                            });
                        } else {
                            callback(403 , {'Error': 'Missing required Token in header or token is invalid'});
                        }
                    });
                } else {
                    callback(400 , {'Error':'Check doesn\'t exist'});
                }
            });
        } else {
            callback(400, {'Error':'Missing optional field(s)'});
        }
    } else {
        callback(400 , {'Error':'Missing Required Fields'});
    }
}


// checks - delete
// Required data : id
// optional data : none
handlers._checks.delete = function(data , callback) {
    // Check that the phone number is invalid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ? data.queryStringObject.id.trim() : false;
    if(id) {
        // Lookup the check
        _data.read ('checks' , id , function (err , checkData){
            if(!err && checkData) {
                // Get token from headers
                var token = typeof(data.headers.token)== 'string' ? data.headers.token : false;
                // Verify the token
                handlers._tokens.verifyToken(token , checkData.userPhone , function(tokenIsValid) {
                    if(tokenIsValid) {
                        _data.read('users' , checkData.userPhone , function (err , userData) {
                            if (!err && userData) {
                                // Delete the data
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                // Remove the  delete check from list of checks
                                var checkPosition = userChecks.indexOf(id);
                                if(checkPosition > - 1) {
                                    userChecks.splice(checkPosition , 1);
                                    // Resave the user's data
                                    _data.update('users' , checkData.userPhone , userData , function(err) {
                                        if(!err) {
                                            callback(200);
                                        } else {
                                            callback(500 , {'Error':'Unable to update user\'s data'});
                                        }
                                    });
                                } else {
                                    callback(500 , {'Error':'Could not find check in user\'s data, so could not delete'});
                                }
                            } else {
                                callback(500 , {'Error' : 'Could not find the specified user for specified check'});
                            }
                        });
                    } else {
                        callback(403 , {'Error': 'Missing required Token in header or token is invalid'});
                    }
                });
            } else {
                callback(400 , {'Error':'checkID doesn\'t exists'});
            }
        });
    } else {
        callback(400 , {'Error' : 'Missing required field'});
    }
}



// Not Found Handler
handlers.notFound = function (data , callback) {
    callback(404);
};

// Export the module
module.exports = handlers;