//Module for DB connection
var MongoClient = require('mongodb').MongoClient;
var _db;
const dbURI = process.env.MONGODB_URI;

module.exports = {

  connectToServer: function(callback) {
    MongoClient.connect(dbURI, function(err, database) {
      _db = database.db('healthoutloud');
      return callback(err);
    });
  },

  getDb: function() {
    return _db;
  }
};
