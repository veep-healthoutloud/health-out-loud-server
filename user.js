//JS Model for User Object
var crypto - require('crypto');
var jwt = require('jsonwebtoken');

class User {

	constructor(id, email) {
		this.id = id;
		this.email = email;
		this.salt;
		this.hash;
	}

	setPassword(password) {
		this.salt = crypto.randomBytes(16).toString('hex');
  		this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
	}

	validatePassword(password) {
		var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
  		return this.hash === hash;
	}

	createJWT() {
		const jwtToken = jwt.sign({
			id: this.id,
			email: this.email
		},
		'temp_secret',
		{
			expiresIn: '2h'
		});
	}
}