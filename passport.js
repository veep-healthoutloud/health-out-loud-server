//This file houses passport.js strategies to be used as middleware authentication in endpoints
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./user');

const passportJWT = require('passport-jwt');
const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

var dbConnection = require('./db_connection');
var db;
dbConnection.connectToServer(function(err) {
	if (err) return console.log(err);
	db = dbConnection.getDb();
});

passport.use('local', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        session: false
    }, 
    function (email, password, done) {
    	//Make sure user is verified, unverified users must not get a JWT
	  	db.collection('unverified').count({ email: email }, function (err, count){ 
	    	if(count > 0) {
	        	return done(null, false, {error: 'User is unverified'});
	    	}
		}); 

		db.collection('user').findOne({ email: email }, function (err, result) { 
			if (!result) {
				return done(null, false, {error: 'Incorrect email or password.'}); //User doesnt exist
			}
			//User exists so validate password using salt/hash
			var user = new User(result.email);
			user.setSalt(result.salt);
			user.setHash(result.hash);

			if (!user.validatePassword(password)) { //Validate with user supplied password
				return done(null, false, {error: 'Incorrect email or password.'});
			}

			//Password valid so return user object
			return done(null, user, {success: 'Logged In Successfully'});	
		});  
    }
));

passport.use(new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey   : 'temp_secret'
    },
    function (jwtPayload, done) {
    	//Can use email to find user in db, not needed as of now.
    	var user = new User(jwtPayload.email);
    	return done(null, user);
    }
));