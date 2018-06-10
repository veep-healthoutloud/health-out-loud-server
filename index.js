const express = require('express');
const app = express();

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
	if (err) return console.log(err);

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
	if (!(req.body.email && req.body.password)) return res.status(400).send({ error: 'Missing parameters' });

	// Create a new user
	var user = new User(req.body.email);
	//Validate email and password
	if (!user.isValidEmail(req.body.email)) return res.status(400).send({ error: 'Invalid email' });
	if (!user.isValidPassword(req.body.password)) return res.status(400).send({ error: 'Invalid password' });

	//Check if email already exists, has a callback parameter so server waits for its result
	dbUtils.emailExists(req.body.email, function(emailExists) { //emailExists variable is returned by callback in db_utils
		if (emailExists) {
			return res.status(400).send({ error: 'Email already exists' });
		}
		else {
			//Save user to unverified collection
			user.setPassword(req.body.password); //salt and hash
			user.createVerifyToken();

			db.collection('unverified').save(user, (err, result) => {
				if (err) return console.log(err);
				//this type of result object with ops is only returned on an insert
				return res.json({client_id: result.ops[0]._id, verification_code: user.token.verifyToken});
			});   

			//send email
		}
	});
});

//http://localhost:8080/verifyAccount?client_id=cd2b7c19c9734a2ab98dc251868d7724&verification_code=fdca81bae49e43a8b20493fc5ee29052
// Verify a user through token link received by email
app.get('/verifyAccount', (req, res) => {
	//Find the user that needs to be verified by looking for token
	db.collection('unverified').findOne({ "_id": ObjectID(req.query.client_id) }, function (err, result) { 
		if (err) return res.status(500).send(err);
  		if (!result) return res.status(404).send({ error: 'User does not exist' });

  		if (req.query.verification_code !== result.token.verifyToken) return res.status(404).send({ error: 'Invalid token' });

  		//Tokens are the same now make sure token is not expired
  		var user = new User(result.email);
  		//user.setToken(result.token); //Dont need this ?
  		if (!user.isValidToken(result.token)) return res.status(400).send({ error: 'Expired token' });

  		//Token is valid so move to user collection since the user has now been validated
  		//These operations are not atomic!
  		//Dont need to remove the token field from db, just reset it when its used again
  		db.collection('user').insert(result);
  		db.collection('unverified').remove(result);

  		return res.sendStatus(200);

	}); 
});

app.post('/login', function (req, res) {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
          console.log(err);
          return res.sendStatus(404);
        }
        if (!user) return res.status(401).send(info);

        //user validated in passport.js (since user object was returned) - return token
        var userToken = user.createJWT();
        return res.json({token: userToken});

    })(req, res);
});

//Endpoint for resending verification email (generating a new verification code)
//http://localhost:8080/refreshVerifyAccount?client_id=cd2b7c19c9734a2ab98dc251868d7724
app.get('/refreshVerifyAccount', passport.authenticate('jwt', { session: false }), (req, res) => {
		db.collection('unverified').findOne({ "_id": ObjectID(req.query.client_id) }, function (err, result) { 
		if (err) return res.status(500).send(err);
  		if (!result) return res.status(404).send({ error: 'User does not exist' });

  		//generate a new token using user object
  		var user = new User(result.email);
  		var newVerifyToken = user.createVerifyToken();

  		//update it in the unverified collection
  		db.collection('unverified').update({"_id": ObjectID(req.query.client_id)}, {$set:{"token": newVerifyToken}}, function(err, result){
		    if (err) console.log('Error updating object: ' + err);
		});

  		//Send email

  		//return response with the newly generated verify token
  		return res.json({verifyToken: newVerifyToken.verifyToken});
	}); 
});


//POST ENDPOINTS

app.post('/post', function (req, res) {
    passport.authenticate('jwt', (err, user, info) => {
        if (err) {
          console.log(err);
          return res.sendStatus(404);
        }

        //Request must supply post text and a feelings array
		if (!(req.body.postBody && req.body.feelings)) return res.status(400).send({ error: 'Missing parameters' });

		//add a user and date to request
		req.body.author = user.email;
		req.body.date = new Date().toJSON();

		//Create new post
		db.collection('post').save(req.body, (err, result) => {
		    if(err) {
	    		response = {error: "Error adding data"};
	  		} 
	  		else {
	    		response = {success: "Data added", id: result._id};
	  		}
	  		res.json(response);
	  	})
    })(req, res);
});

// Get all posts by a feeling
app.get('/posts/feeling/:feeling', passport.authenticate('jwt', { session: false }), (req, res) => {
	db.collection('post').find({feelings: req.params.feeling}).toArray(function(err, result) {
  		if (err) return res.status(500).send(err);
  		res.json(result);
	});
});

// Get all posts by a user
app.get('/posts/user/:email', passport.authenticate('jwt', { session: false }), (req, res) => {
	db.collection('post').find({author: req.params.email}).toArray(function(err, result) {
  		if (err) return res.status(500).send(err);
  		res.json(result);
	});
});

// Get all posts
app.get('/posts', passport.authenticate('jwt', { session: false }), (req, res) => {
  	db.collection('post').find().toArray(function(err, result) {
  		if (err) return res.status(500).send(err);
  		res.json(result);
	});
});