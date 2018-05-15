//JS Model for User Object
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var validator = require("email-validator");

class User {

	constructor(email) {
		this.email = email;
		this.salt;
		this.hash;
	}

	isValidEmail(email) {
		return validator.validate(email);
	}

	isValidPassword(password) {
		//Add more password requirements here (probably use a library here)

		return password.length >= 6;
	}

	setPassword(password) {
		this.salt = crypto.randomBytes(16).toString('hex');
  		this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 64,'sha512').toString('hex');
	}

	validatePassword(password) {
		var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 64,'sha512').toString('hex');
  		return this.hash === hash;
	}

	createJWT() {
		const jwtToken = jwt.sign({
			email: this.email
		},
		'temp_secret',
		{
			expiresIn: '2h'
		});
	}
}

module.exports = User;