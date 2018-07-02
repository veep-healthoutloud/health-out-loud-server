const express = require('express');
const app = express();

require('dotenv').config(); //module to use env variables from a local .env file

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var ObjectID = require('mongodb').ObjectID;

const passport = require('passport');
require('./passport');

const User = require('./user');
const port = process.env.PORT || 3000;

//Get DB Connection and start server
var dbConnection = require('./db_connection');
var db;
dbConnection.connectToServer(function(err) {
	if (err) return console.log({error: true, message: err});

	db = dbConnection.getDb();

  	app.listen(port, () => {
	    console.log('listening on 3000')
	    console.log("Server is up and running!")
	});
});

var dbUtils = require('./db_utils');

// USER ENDPOINTS

//Registration: Add a new user to db
app.post('/registerAccount', (req, res) => {
	// Only write to DB if email and password are provided
	if (!(req.body.email && req.body.password)) return res.status(400).send({ error: true, message: 'Missing parameters' });

	// Create a new user
	var user = new User(req.body.email);
	//Validate email and password
	if (!user.isValidEmail(req.body.email)) return res.status(400).send({ error: true, message: 'Invalid email' });
	if (!user.isValidPassword(req.body.password)) return res.status(400).send({ error: true, message: 'Invalid password' });

	//Check if email already exists, has a callback parameter so server waits for its result
	dbUtils.emailExists(req.body.email, function(emailExists) { //emailExists variable is returned by callback in db_utils
		if (emailExists) {
			return res.status(400).send({ error: true, message: 'Email already exists' });
		}
		else {
			//Save user to unverified collection
			user.setPassword(req.body.password); //salt and hash
			user.createVerifyToken();

			db.collection('unverified').save(user, (err, result) => {
				if (err) {
					console.log(err);
					return res.status(500).send({error: true, message: err});
				}
				//this type of result object with ops is only returned on an insert
				return res.json({error: false, clientID: result.ops[0]._id, verificationCode: user.token.verifyToken});
			});   

			//send email
		}
	});
});

// Verify a user through token link received by email
app.get('/verifyAccount', (req, res) => {
	//Find the user that needs to be verified
	db.collection('unverified').findOne({ "_id": ObjectID(req.query.clientID) }, function (err, result) { 
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}
  		if (!result) return res.status(404).send({ error: true, message: 'User does not exist or already verified' });

  		if (req.query.verificationCode !== result.token.verifyToken) return res.status(404).send({ error: true, message: 'Invalid token' });

  		//Tokens are the same now make sure token is not expired
  		var user = new User(result.email);
  		if (!user.isValidToken(result.token)) return res.status(400).send({ error: true, message: 'Expired token' });

  		//Token is valid so move to user collection since the user has now been validated
  		//These operations are not atomic!
  		//Dont need to remove the token field from db, just reset it when its used again
  		db.collection('user').insert(result);
  		db.collection('unverified').remove(result);

  		return res.status(200).send({ error: false, message: 'Account verified' });
	}); 
});

app.post('/login', function (req, res) {
    passport.authenticate('local', (err, user, info) => {
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}

		if (!user) {
			return res.status(401).send(info);
        }

        //user validated in passport.js (since user object was returned) - return token
        var userToken = user.createJWT();
        return res.json({error: false, token: userToken});
	})(req, res);
});

//Endpoint for resending verification email (generating a new verification code)
app.get('/refreshVerifyAccount', passport.authenticate('jwt', { session: false }), (req, res) => {
		db.collection('unverified').findOne({ "_id": ObjectID(req.query.client_id) }, function (err, result) { 
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}
  		if (!result) return res.status(404).send({ error: true, message: 'User does not exist' });

  		//generate a new token using user object
  		var user = new User(result.email);
  		var newVerifyToken = user.createVerifyToken();

  		//update it in the unverified collection
  		db.collection('unverified').update({"_id": ObjectID(req.query.client_id)}, {$set:{"token": newVerifyToken}}, function(err, result){
		    if (err) {
		    	console.log('Error updating object: ' + err);
		    	return res.status(500).send({error: true, message: err});
		    }
		});

  		//Send email

  		//return response with the newly generated verify token
  		return res.json({error: false, verifyToken: newVerifyToken.verifyToken});
	}); 
});

//This endpoint is for authenticated users, change password in settings menu for example.
app.post('/changePassword', function (req, res) {
	//Since user is logged in they should have a valid JWT
    passport.authenticate('jwt', (err, user, info) => {
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}
		if (!user.email) return res.status(404).send({ error: true, message: 'User doesnt exist' }); //sanity check

		db.collection('user').findOne({ email: user.email }, function (err, result) { 
			if (err) {
				console.log(err);
				return done(null, false, {error: true, message: err});
			}
			if (!result) return res.status(404).send({ error: true, message: 'User doesnt exist' });
	        //verify old password
	        user.setSalt(result.salt);
			user.setHash(result.hash);
			if (!user.validatePassword(req.body.oldPassword)) return res.status(400).send({ error: true, message: 'Incorrect old password' });

			//Make sure new password is a valid one
			if (!user.isValidPassword(req.body.newPassword)) return res.status(400).send({ error: true, message: 'Invalid new password' });

			//Update user collection with new salt/hash to reflect the new password
			user.setPassword(req.body.newPassword);
			//save to user collection
			db.collection('user').updateOne({ email: user.email }, {$set:{ "salt": user.salt, "hash": user.hash, "token": {} }}, function(err, result){
				if (err) {
					console.log(err);
					return res.status(500).send({error: true, message: err});
				}
				return res.status(200).send({ error: false, message: 'Password successfully changed' });
			});   
		});  
	})(req, res);
});

//endpoint to generate password reset token and send email to user
app.get('/passwordResetToken', (req, res) => {
	db.collection('user').findOne({ "email": req.query.email }, function (err, result) { 
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}
  		if (!result) return res.status(404).send({ error: true, message: 'User does not exist' });

  		//generate a new token using user object
  		var user = new User(result.email);
  		var newPasswordResetToken = user.createPasswordResetToken();

  		//update it in the unverified collection
  		db.collection('user').update({ email: req.query.email }, {$set:{"token": newPasswordResetToken}}, function(err, result){
		    if (err) {
		    	console.log('Error updating object: ' + err);
		    	return res.status(500).send({error: true, message: err});
		    }
		});

  		//Send email with URL to reset password

  		//return response with the newly generated verify token
  		return res.json({error: false, passwordResetToken: newPasswordResetToken.passwordResetToken});
	}); 
});

//Change password for non-authenticated users, since they arent logged in use a password reset token + email to reset password
app.post('/forgotPassword', (req, res) => {
	db.collection('user').findOne({ email: req.body.email }, function (err, result) { 
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}
  		if (!result) return res.status(404).send({ error: true, message: 'User does not exist' });

  		if (req.body.passwordResetToken !== result.token.passwordResetToken) return res.status(404).send({ error: true, message: 'Invalid token' });

  		//Tokens are the same now make sure token is not expired
  		var user = new User(result.email);
  		if (!user.isValidToken(result.token)) return res.status(400).send({ error: true, message: 'Expired token' });

  		//Update with new password
		if (!user.isValidPassword(req.body.newPassword)) return res.status(400).send({ error: true, message: 'Invalid new password' });
		user.setPassword(req.body.newPassword);
		//save to user collection
		db.collection('user').updateOne({ email: user.email }, {$set:{ "salt": user.salt, "hash": user.hash, "token": {} }}, function(err, result){
			if (err) {
				console.log(err);
				return res.status(500).send({error: true, message: err});
			}
			return res.status(200).send({ error: false, message: 'Password reset' });
		}); 
	}); 
});

//POST ENDPOINTS

app.post('/post', (req, res) => {
    passport.authenticate('jwt', (err, user, info) => {
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}

        //Request must supply post text and a feelings array
		if (!(req.body.postBody && req.body.feelings)) return res.status(400).send({ error: true, message: 'Missing parameters' });

		//add a user and date to request
		req.body.author = user.email;
		req.body.date = new Date().toJSON();

		//Create new post
		db.collection('post').save(req.body, (err, result) => {
			if (err) {
				console.log(err);
				return res.status(500).send({error: true, message: err});
			}
	  		res.json({error: false, id: result._id});
	  	});
    });
});

// Get all posts by a feeling
app.get('/posts/feeling/:feeling', passport.authenticate('jwt', { session: false }), (req, res) => {
	db.collection('post').find({feelings: req.params.feeling}).toArray(function(err, result) {
  		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}
  		res.json(result);
	});
});

// Get all posts by a user
app.get('/posts/user/:clientID', passport.authenticate('jwt', { session: false }), (req, res) => {
	db.collection('post').find({ "_id": ObjectID(req.query.clientID) }).toArray(function(err, result) {
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}
  		res.json(result);
	});
});

// Get all posts
app.get('/posts', passport.authenticate('jwt', { session: false }), (req, res) => {
  	db.collection('post').find().toArray(function(err, result) {
		if (err) {
			console.log(err);
			return res.status(500).send({error: true, message: err});
		}
  		res.json(result);
	});
});
