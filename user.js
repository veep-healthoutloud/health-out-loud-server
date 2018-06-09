//JS Model for User Object
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var validator = require("email-validator");

class User {

	constructor(email) {
		//Fields here will get saved to DB, when saving the User object
		this.email = email;
		this.salt;
		this.hash;
		this.token; //General token - could be used for verification, password reset
	}

	isValidEmail(email) {
		return validator.validate(email);
	}

	isValidPassword(password) {
		//Add more password requirements here (probably use a library here)

		return password.length >= 6;
	}

	//validate token by expiry
	isValidToken(token) {
		var now = new Date();
		return token.expires > now; //false = token is expired
	}

	setPassword(password) {
		this.salt = crypto.randomBytes(16).toString('hex');
  		this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 64, 'sha512').toString('hex');
	}

	setSalt(salt) {
		this.salt = salt;
	}

	setHash(hash) {
		this.hash = hash;
	}

	setToken(token) {
		this.token = token;
	}

	validatePassword(password) {
		var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 64, 'sha512').toString('hex');
  		return this.hash === hash;
	}

	createVerifyToken() {
		var randToken = crypto.randomBytes(16).toString('hex');
		var expiry = new Date();
		expiry.setHours(expiry.getHours() + 8); //Set expiry 8 hours in the future

		//Random 16 character token with expiry
		const verifyToken = {
			verifyToken: randToken,
			expires: expiry
		};

		this.token = verifyToken;

		return verifyToken;
	}

	createJWT() {
		const jwtToken = jwt.sign({
			email: this.email
		},
		'temp_secret',
		{
			expiresIn: '2h'
		});

		return jwtToken;
	}
}

module.exports = User;