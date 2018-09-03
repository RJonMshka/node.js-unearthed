/*
* Helpers for various tasks 
*
 */

// Dependencies
var crypto = require('crypto');
var config = require('../config');


//  Container for all the helper
var helpers = {};


// Create a SHA256 hash
helpers.hash = function (str) {
    if (typeof(str) == 'string' && str.length > 0 ) {
        var hash = crypto.createHmac( 'sha256' , config.hashingSecret).update(str).digest('hex');   
        return hash;        
    } else {
        return false;
    }
}

// Parse JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str) {
    try {
        var obj = JSON.parse(str);
        return obj; 
    } catch(e) {
        return {};
    }
}

// Create a string of random alpha-numeric characters of given length
helpers.createRandomString = function(strLength) {
    strLength = (typeof(strLength) == 'number' && strLength > 0 ) ? strLength : false;
    if (strLength) {
        // Define all possible characters that could go into string
        var possibleCharacters = 'abcdefghijklmnopqrstuv0123456789';

        // Start the final string
        var str = '';
        for(i = 1; i< strLength; i++) {
            // Get a random character from possibleCharater string
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

            str += randomCharacter;
        }
        return str;
    } else {
        return false;
    }
}


// Exporting the module
module.exports = helpers;