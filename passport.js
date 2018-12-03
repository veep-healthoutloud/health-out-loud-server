//This file houses passport.js strategies to be used as middleware authentication in endpoints
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./user');

const passportJWT = require('passport-jwt');
const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const jwt = require('jsonwebtoken');

//Grab DB connection
var dbConnection = require('./db_connection');
var db;
dbConnection.connectToServer(function(err) {
	if (err) return console.log(err);
	db = dbConnection.getDb();
});

var dbUtils = require('./db_utils');

passport.use('local', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        session: false
    },
    function (email, password, done) {
    	//Check if user is in unverified collection, otherwise find the user set credentials
		dbUtils.checkIfQueryExists('unverified', {email: email}, function(isNotVerified) {
            console.log(isNotVerified);
		    if(isNotVerified) { //return with error since unverified users must not get a JWT
		    	return done(null, false, false, {error: 'User is unverified'});
		    }
		    else { //Find the user
		    	db.collection('user').findOne({ email: email }, function (err, result) {
		    		if (err) {
		    			console.log(err);
		    			return done(null, false, false, {error: true, message: err});
		    		}
                    if (!result) return done(null, false, false, {error: true, message: 'Incorrect email or password.'}); //User doesnt exist

					//User exists so validate password using salt/hash
					var user = new User(result.email);
					user.setSalt(result.salt);
					user.setHash(result.hash);
                    console.log("C");
					if (!user.validatePassword(password)) { //Validate with user supplied password
						return done(null, false, false, {error: true, message: 'Incorrect email or password.'});
					}
                    console.log("D");
					//Password valid so return user object

					//create a token containing user email (used to authenticate)
					const usertoken = jwt.sign(user.email, process.env.AUTH_KEY);
					return done(null, user, usertoken, {error:false, message: 'Logged In Successfully'});
				});
		    }
		});
    }
));

const opts = {}
opts.jwtFromRequest = ExtractJWT.fromAuthHeaderAsBearerToken();
opts.secretOrKey =  process.env.AUTH_KEY;


const strategy = new JWTStrategy(opts, (jwtpayload, done) => {
	//user contains the email of the current user
	var email = new User(jwtpayload);
	db.collection('user').findOne({ email: email }, function (err, result) {
		if (err) {
			console.log(err);
			return done(null, false);
		}
		if (!result) return done(null, false);
	});
	return done(null, email);
});

passport.use(strategy);
