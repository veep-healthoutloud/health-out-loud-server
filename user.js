//JS Model for User Object
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var emailValidator = require("email-validator");
var passwordValidator = require('password-validator');

class User {

	constructor(email) {
		//Fields here will get saved to DB, when saving the User object
		this.email = email;
		this.salt;
		this.hash;
		this.token; //General token - could be used for verification, password reset
	}

	isValidEmail(email) {
		return emailValidator.validate(email);
	}

	isValidPassword(password) {
		var schema = new passwordValidator();
		schema
		.is().min(8)                                    // Minimum length 8
		.is().max(64)                                  // Maximum length 64
		.has().uppercase()                              // Must have uppercase letters
		.has().lowercase()                              // Must have lowercase letters
		.has().digits()                                 // Must have digits

		return schema.validate(password); //optional: add { list: true} to schema.validate to return an array of failed rules
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

	createPasswordResetToken() {
		var randToken = crypto.randomBytes(16).toString('hex');
		var expiry = new Date();
		expiry.setHours(expiry.getHours() + 1); //Set expiry 8 hours in the future

		//Random 16 character token with expiry
		const passwordResetToken = {
			passwordResetToken: randToken,
			expires: expiry
		};

		this.token = passwordResetToken;

		return passwordResetToken;
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