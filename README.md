# Server for VEEP Health Out Loud
Sample User to log in with:
test@mail.utoronto.ca
Test1234

**User Registration**
----
Adds a new User to the database.

* **URL**
/user

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
**Content:** `OK`

* **Error Response:**

* **Code:** 400 BAD REQUEST <br />
**Content:** 
`{ error : "Missing parameters" }`
`{ error : "Invalid email" }`
`{ error : "Invalid password" }`
`{ error : "Email already exists" }`

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
**Content:** `{ token : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3QxQG1haWwudXRvcm9udG8uY2EiLCJpYXQiOjE1MjgzMDUzNzUsImV4cCI6MTUyODMxMjU3NX0.7_qDXtw8qlnezoTGvFaA768ZxW4Qr2JhVYlHXyrPuWk" }`

* **Error Response:**

* **Code:** 404 NOT FOUND <br />
**Content:** <passport error>

* **Code:** 401 UNAUTHORIZED <br />
**Content:** `{ error : "Incorrect email or password." }`


**The following endpoints now require a Bearer token obtained from /login**
In the header of any request you must have
`Authorization : Bearer <token_string>`

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
**Content:** `{success: "Data added", id: <post_id>}`

* **Error Response:**

* **Code:** 400 BAD REQUEST <br />
**Content:** `{ error : "Missing parameters" }`

* **Code:** 401 UNAUTHORIZED For Invalid/Missing token

**Get All Posts**
----
* **URL**
/posts - Get all posts
/posts/feeling/:feeling  - Get all posts by a feeling
/posts/user/:email  - Get all posts by a user (email)

* **Method:**
`GET`

*  **URL Params**
/posts **requires no URL params**
/:feeling ``http://localhost:3000/posts/feeling/Happy``
/:email ``http://localhost:3000/posts/user/test1@mail.utoronto.ca``

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

* **Code:** 500 INTERNAL SERVER ERROR <br />

* **Code:** 401 UNAUTHORIZED For Invalid/Missing token

