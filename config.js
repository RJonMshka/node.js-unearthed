/*
* Create and export configuration variables
*/

// Container for all the Environments
var environments = {};  

// Staging (default) environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret' : 'thisIsASecret'
};


// Production environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret' : 'thisIsAlsoASecret'
};

// Determine which environment was passed as a command line argument   
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check if current environment is one of the environments above, if not, set default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Exporting the environment
module.exports = environmentToExport;

