/* Common helper functions for db */

//Grab DB connection
var dbConnection = require('./db_connection');
var db;
dbConnection.connectToServer(function(err) {
	if (err) return console.log(err);
	db = dbConnection.getDb();
});

module.exports = {
	//For example check if a user exists in unverified collection to determine if user is verified or not
	//Has a callback (onDone) so you can check result and then synchrously execute another db call
	//query variable is {param: value}
	checkIfQueryExists: function(collectionName, query, onDone) {
		db.collection(collectionName).count(query, function (err, count){ 
	    	if (onDone) onDone((count > 0)); //Call the callback with results of the exists check
		}); 
	},

	emailExists: function(clientEmail, callback) {
		module.exports.checkIfQueryExists("user", {email: clientEmail}, function(userExists) {
		    if(userExists) {
		    	callback(true);
		    }
		    else {
		    	//Check unverified collection for the email
		    	module.exports.checkIfQueryExists("unverified", {email: clientEmail}, function(isNotVerified) {
				    if(isNotVerified) { //The email exists as an unverified user
				    	callback(true);
				    }
				    else { //Email does not exist in either user collection or unverified collection
				    	callback(false);
				    }
				});
		    }
		});
	}
};