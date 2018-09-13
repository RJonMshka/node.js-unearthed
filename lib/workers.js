/**
 * Worker related Tasks
 * 
 */

//  Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');



// Instantiate the Worker Object
var workers = {};


// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = function (){
    // Get all the checks
    _data.list('checks',function(err ,checks){
        if(!err && checks &&checks.length>0) {
            checks.forEach(function(check){
                // Read the check data
                _data.read('checks',check, function(err , originalCheckData){
                    if(!err && originalCheckData) {
                        // Pass the data to check Validator
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log("Error: Reading one of the checks data");
                    }
                });
            });
        } else {
            console.log("Error: Could not found any checks to process");
        }
    });
}

// Sanity-checking the check data
workers.validateCheckData = function(originalCheckData) {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 19 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol)>-1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post','get','put','delete'].indexOf(originalCheckData.method)>-1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0  ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 == 0 && originalCheckData.timeoutSeconds >=1 && originalCheckData.timeoutSeconds <=5 ?   originalCheckData.timeoutSeconds : false;

    // Set the keys that may not set (if the workers have never seen this check before)
    // If never checked, assume it to be dowm and last checked will be false
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ?  originalCheckData.lastChecked : false;

    // If all the check passed, pass the data to next step in the process
    if(originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds) {
        workers.performCheck(originalCheckData);
    } else {
        console.log("Error : One of the checks is not properly formatted");
    }

}


// Perform the check, send the originalCheckData and outcome of process to next step of the process
workers.performCheck = function(originalCheckData) {
    // Prepare the initial check outcome
    var checkOutcome = {
        'error'  : false,
        'responseCode': false
    };

    // Mark that outcome has not been sent yet
    var outcomeSent = false;

    // Parse the hostname and path from original check data
    var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url,true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path; // Using path, not pathname because we want the query string 

    // Construct the request
    var requestDetails = {
        'protocol': originalCheckData.protocol+':',
        'hostname': hostName,
        'method':originalCheckData.method.toUpperCase(),
        'path':path,
        'timeout':originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object, using either the HTTP, HTTPS module
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function(res){
        // Grab the status of sent request
        var status = res.statusCode;

        // Update the check outcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData , checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so that it doesn't get thrown
    req.on('error' , function(e){
        // Update the check outcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': e
        };
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData , checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('timeout' , function(e){
        // Update the check outcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData , checkOutcome);
            outcomeSent = true;
        }
    });

    // End the request
    req.end();

}

// Purpose of this fn is to process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert that one)
workers.processCheckOutcome  = function(originalCheckData , checkOutcome) {
    console.log(checkOutcome , originalCheckData.url);
    // Decide if the check is considered up or down in current state
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Decide if an alert is warranted
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Update the check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    // Save the updates
    _data.update('checks',newCheckData.id ,newCheckData, function(err) {
        if(!err) {
            // Send the new check data to te next phase in the process if needed
            if(alertWarranted) {
                workers.alertUsersToStatusChange(newCheckData);
            }else {
                console.log("CHeck outcome has not changed, no alert needed");
            }
        }else {
            console.log("Error trying to save updates to one of the checks");
        }
    });
}

// Alert the user as to a achange in their status checks
workers.alertUsersToStatusChange = function(newCheckData) {
    var msg = 'Alert: Your Check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone , msg , function(err){
        if(!err) {
            console.log("Success! User was alerted to a status change, via SMS: ",msg);
        } else {
            console.log('Error: Could not send SMS to user, who had state change');
        }
    });
}




// Timer to execute worker process once per minute
workers.loop = function() {
    setInterval(function(){
        workers.gatherAllChecks();
    },1000 * 5);
}

// Init Script
workers.init = function(){
    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();
}

// Export the Module
module.exports = workers;