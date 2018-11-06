//This file houses passport.js strategies to be used as middleware authentication in endpoints
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./user');

const passportJWT = require('passport-jwt');
const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

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
		    	return done(null, false, {error: 'User is unverified'});
		    }
		    else { //Find the user
		    	db.collection('user').findOne({ email: email }, function (err, result) { 
		    		if (err) {
		    			console.log(err);
		    			return done(null, false, {error: true, message: err});
		    		}
                    if (!result) return done(null, false, {error: true, message: 'Incorrect email or password.'}); //User doesnt exist
				
					//User exists so validate password using salt/hash
					var user = new User(result.email);
					user.setSalt(result.salt);
					user.setHash(result.hash);
                    console.log("C");
					if (!user.validatePassword(password)) { //Validate with user supplied password
						return done(null, false, {error: true, message: 'Incorrect email or password.'});
					}
                    console.log("D");
					//Password valid so return user object
					return done(null, user, {error:false, message: 'Logged In Successfully'});	
				});  
		    }
		});
    }
));

passport.use(new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey   : process.env.AUTH_KEY
    },
    function (jwtPayload, done) {
    	//Can use email to find user in db, not needed as of now.
    	var user = new User(jwtPayload.email);
    	return done(null, user);
    }
));
