const express = require('express');
const app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

const MongoClient = require('mongodb').MongoClient

// DB INITIALIZATION STUFF
var db;
// This is connecting to our cloud which we registered for 02/04/2018. URL format is mongodb://<user>:<password>@ds125068......
MongoClient.connect('mongodb://test:test@ds125068.mlab.com:25068/healthoutloud', (err, database) => {
	if (err) return console.log(err);

	// recall that our db name is healthoutloud (this should be paramatized later to be <databasename>)
	// TODO: if we ever need more than one database, change 'healthoutloud' string literal to <databasename>
	db = database.db('healthoutloud');

	// only start the server if the database is running
	app.listen(3000, () => {
	    console.log('listening on 3000')
	    console.log("Server is up and running!")
	});
});

/*
	BACKEND GUYS: try to keep naming of parameters in the callbacks consistent so we don't get confused
	eg. req for Request, res for Response. Also, when returning the responses, first check if Courtney
	has specified any particular format/shape of the JSON body; otherwise keep the response body SHALLOW
	eg. {'key1' : 'value1', 'key2' : 'value2'} vs. {'key1': {key2 : [value1, value2]}}
*/

// ROOT
app.get('/', (req, res) => {
	res.send('Hello World');
});

// USER ENDPOINTS
app.post('/user', (req, res) => {
	// Only write to DB if email and password are provided
	if (!(req.body.email && req.body.password)) return console.log('email & password not provided');
	if (!(validateEmail(req.body.email) && validatePassword(req.body.password))) return console.log('invalid email or password');

	// Create a new user
	db.collection('user').save(req.body, (err, result) => {
		if (err) return console.log(err);

		res.send({'email': req.email});
	});
});

app.put('/user', (req, res) => {

});

//TODO: Request parameter validation, etc feeling should be an array

//POST ENDPOINTS
app.post('/post', (req, res) => { 
	//Request must supply post text and a feeling array
	if (!(req.body.postBody && req.body.feeling)) return res.sendStatus(400); //Bad request, missing parameters

	//add a user and date to request
	req.body.author = "TEMP"; //TODO: Need to pass along user id, once we add authentication
	req.body.date = new Date().toJSON();

	//Create new post
	db.collection('post').save(req.body, (err, result) => {
	    if(err) {
    		response = { error: true, message: "Error adding data" };
  		} 
  		else {
    		response = { error: false, message: "Data added", id: result._id };
  		}
  		res.json(response);
  	})

});

//POSTS Endpoints

// Get all posts by a feeling
app.get('/posts/feeling/:feeling', (req, res) => {
	db.collection('post').find({feeling: req.params.feeling}).toArray(function(err, result) {
  		if (err) return res.status(500).send(err);

  		res.json(result);
	});
});

// Get all posts
app.get('/posts', (req, res) => {
  	db.collection('post').find().toArray(function(err, result) {
  		if (err) return res.status(500).send(err);

  		res.json(result);
	});
});

// TODO: write implementations of password + email validation and then move them to a separate helper node module.
function validatePassword(password) {
	// validate password
}

function validateEmail(email) {
	// validate email
}

// TODO: handle the case where somehow a request is sent but the database is down (and by extension the server is down	)

// NOTES (Refer to here if there's something that applies to a lot of code but isn't commented)

// LAMBDAS: Lambdas are anonymous functions that are used once and then (presumably) discarded from memory
// they are initialized using (param1, param2, ... , paramN) => {// function definition} and are equivalent to
// function (param1, param2, ... , paramN) {// do stuff}

// Logging Errors: If any of your callback functions (lambdas) have an error, return immediately and log the error