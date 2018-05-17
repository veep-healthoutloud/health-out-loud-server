//This file houses passport.js strategies to be used as middleware authentication in endpoints
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./user');

const passportJWT = require('passport-jwt');
const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

const MongoClient = require('mongodb').MongoClient;
const port = process.env.PORT || 3000;
const dbURI = process.env.MONGODB_URI || "mongodb://test:test@ds125068.mlab.com:25068/healthoutloud";

// DB INITIALIZATION STUFF
var db;
// This is connecting to our cloud which we registered for 02/04/2018. URL format is mongodb://<user>:<password>@ds125068......
MongoClient.connect(dbURI, (err, database) => {
	if (err) return console.log(err);
	db = database.db('healthoutloud');
});

passport.use('local', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        session: false
    }, 
    function (email, password, done) {
		db.collection('user').findOne({ email: email }, function (err, result){ 
			if (!result) {
				return done(null, false, {message: 'Incorrect email or password.'}); //User doesnt exist
			}
			//User exists so validate password using salt/hash
			var user = new User(result.email);
			user.setSalt(result.salt);
			user.setHash(result.hash);

			if (!user.validatePassword(password)) { //Validate with user supplied password
				return done(null, false, {message: 'Incorrect email or password.'});
			}
			
			//Password valid so return user object
			return done(null, user, {message: 'Logged In Successfully'});	
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