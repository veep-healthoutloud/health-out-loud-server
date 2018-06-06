const express = require('express');
const app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

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

// USER ENDPOINTS

//Registration: Add a new user to db
app.post('/user', (req, res) => {
	// Only write to DB if email and password are provided
	if (!(req.body.email && req.body.password)) return res.status(400).send({ error: 'Missing parameters' });

	// Create a new user
	var user = new User(req.body.email);
	//Validate email and password
	if (!user.isValidEmail(req.body.email)) return res.status(400).send({ error: 'Invalid email' });
	if (!user.isValidPassword(req.body.password)) return res.status(400).send({ error: 'Invalid password' });

	//Check if email already exists
  	db.collection('user').count({ email: req.body.email }, function (err, count){ 
  		if (err) return console.log(err);

    	if(count > 0) {
        	return res.status(400).send({ error: 'Email already exists' });
    	}
    	else { //Save user object to DB
		 	user.setPassword(req.body.password); //salt and hash

			db.collection('user').save(user, (err, result) => {
				if (err) return console.log(err);
				res.sendStatus(200);
			});   		
    	}
	}); 

});

app.post('/login', function (req, res) {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
          console.log(err);
          return res.sendStatus(404);
        }
        if (!user) {
          return res.status(401).send(info);
        }

        //user validated in passport.js (since user object was returned) - return token
        var userToken = user.createJWT();
        return res.json({token: userToken});

    })(req, res);
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

// TODO: handle the case where somehow a request is sent but the database is down (and by extension the server is down	)

// NOTES (Refer to here if there's something that applies to a lot of code but isn't commented)

// LAMBDAS: Lambdas are anonymous functions that are used once and then (presumably) discarded from memory
// they are initialized using (param1, param2, ... , paramN) => {// function definition} and are equivalent to
// function (param1, param2, ... , paramN) {// do stuff}

// Logging Errors: If any of your callback functions (lambdas) have an error, return immediately and log the error