# Server for VEEP Health Out Loud
Sample User to log in with:
test@mail.utoronto.ca
Test1234

**User Registration**
----
Adds a new User to the database.

* **URL**
/registerAccount

* **Method:**
`POST`

*  **URL Params**
None.

* **Body Params**

**Required:**
`email: <email>`
`password: <password>`

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{ error : false, clientID: <>, verificationCode: <> }`

* **Error Response:**

* **Code:** 400 BAD REQUEST <br />
**Content:** 
`{ error : true, message: "Missing parameters" }`
`{ error : true, message: "Invalid email" }`
`{ error : true, message: "Invalid password" }`
`{ error : true, message: "Email already exists" }`

**User Login**
----
Obtain bearer token (JWT) to use to access other endpoints. Uses a local passport.js strategy.

* **URL**
/login

* **Method:**
`POST`

*  **URL Params**
None.

* **Body Params**

**Required:**
`email: <email>`
`password: <password>`

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{ error: false, token : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3QxQG1haWwudXRvcm9udG8uY2EiLCJpYXQiOjE1MjgzMDUzNzUsImV4cCI6MTUyODMxMjU3NX0.7_qDXtw8qlnezoTGvFaA768ZxW4Qr2JhVYlHXyrPuWk" }`

* **Error Response:**

* **Code:** 500<br />
**Content:** `{ error : true, message: <err> }`

* **Code:** 401 UNAUTHORIZED <br />
**Content:** `{ error : "Incorrect email or password." }`

**Email Verification**
----
Verify a user using a verification token with an expiry. This token is obtained on /registerAccount

* **URL**
/verifyAccount

* **Method:**
`GET`

*  **URL Params**
**Required:**
clientID
verificationCode

* **Body Params**
None.

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{ error: false, message : "Account verified" }`

* **Error Response:**

* **Code:** 500<br />
**Content:** `{ error : true, message: <err> }`

* **Code:** 400 <br />
**Content:** `{ error : true, message: "Expired token." }`

* **Code:** 404 NOT FOUND <br />
**Content:** `{ error : true, message: "Invalid token/user does not exist" }`

* **Example:**
`verifyAccount?clientID=cd2b7c19c9734a2ab98dc251868d7724&verificationCode=fdca81bae49e43a8b20493fc5ee29052`

**Start password reset**
----
Forgot a password option for a non-authenticated user, will involve email.

* **URL**
/passwordResetToken

* **Method:**
`GET`

*  **URL Params**
**Required:**
email

* **Body Params**
None.

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{ error: false, passwordResetToken : <> }`

* **Error Response:**

* **Code:** 500<br />
**Content:** `{ error : true, message: <err> }`

* **Code:** 404 NOT FOUND <br />
**Content:** `{ error : true, message: "Invalid token/user does not exist" }`

* **Example:**
`passwordResetToken?email=test@mail.utoronto.ca`

**Forgot Password**
----
After /passwordResetToken is requested use this token and email to set a new password. For non-authenticated users.

* **URL**
/forgotPassword

* **Method:**
`POST`

*  **URL Params**
None.

* **Body Params**

**Required:**
`email: <email>`
`passwordResetToken: <token>`
`newPassword: <newPassword>`

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{ error: false, message : "Password reset" }`

* **Error Response:**

* **Code:** 500<br />
**Content:** `{ error : true, message: <err> }`

* **Code:** 404 NOT FOUND <br />
**Content:** `{ error : true, message: "Invalid token" }`

* **Code:** 400  <br />
**Content:** `{ error : true, message: "Expired token / Invalid New Password" }`


**The following endpoints now require a Bearer token obtained from /login**
In the header of any request you must have
`Authorization : Bearer <token_string>`

**Change Password**
----
Change password for an authenticated (already logged in) user (using JWT).

* **URL**
/changePassword

* **Method:**
`POST`

*  **URL Params**
None.

* **Body Params**

**Required:**
`oldPassword`
`newPassword`

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{ error: false, message : "Password successfully changed" }`

* **Error Response:**

* **Code:** 500<br />
**Content:** `{ error : true, message: <err> }`

* **Code:** 404 NOT FOUND <br />
**Content:** `{ error : true, message: "User doesnt exist" }`

* **Code:** 400<br />
**Content:** `{ error : true, message: "Incorrect old password / Invalid new password" }`

**Refresh/Re-send Email Verification**
----
Generate a new verification token.

* **URL**
/refreshVerifyAccount

* **Method:**
`GET`

*  **URL Params**
**Required:**


* **Body Params**
None.

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{ error: false, verifyToken: <> }`

* **Error Response:**

* **Code:** 500<br />
**Content:** `{ error : true, message: <err> }`

* **Code:** 404 NOT FOUND <br />
**Content:** `{ error : true, message: "User does not exist" }` -> Either already verified or does not exist

* **Example:**
`refreshVerifyAccount?client_id=cd2b7c19c9734a2ab98dc251868d7724`

**Create Post**
----
Create a new post with an associated feeling(s).

* **URL**
/post

* **Method:**
`POST`

*  **URL Params**
None.

* **Body Params**

**Required:**
`postBody: <text here>`
`feelings: Happy`
or
`feelings[0]: Happy`
`feelings[1]: Sad`

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{error: false, id: <post_id>}`

* **Error Response:**

* **Code:** 500<br />
**Content:** `{ error : true, message: <err> }`

* **Code:** 400 BAD REQUEST <br />
**Content:** `{ error : true, message: "Missing parameters" }`

* **Code:** 401 UNAUTHORIZED For Invalid/Missing token

**Get All Posts**
----
* **URL**
/posts - Get all posts
/posts/feeling/:feeling  - Get all posts by a feeling
/posts/user/:clientID  - Get all posts by a user (email)

* **Method:**
`GET`

*  **URL Params**
/posts **requires no URL params**
/:feeling ``/posts/feeling/Happy``
/:email ``/posts/user/5b1eae6418cb8d29ef08bee7``

* **Body Params**
None.

* **Success Response:**

* **Code:** 200 <br />
**Content:** `{
"_id": {
"$oid": "5afdddee5904c57ccc5757bd"
},
"postBody": "temp temp temp",
"feelings": [
"Happy"
],
"author": "test1@mail.utoronto.ca",
"date": "2018-05-17T19:54:22.310Z"
}`

* **Error Response:**

* **Code:** 500<br />
**Content:** `{ error : true, message: <err> }`

* **Code:** 401 UNAUTHORIZED For Invalid/Missing token

