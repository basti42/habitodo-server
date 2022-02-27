require('dotenv').config()
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGO_DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

let dbConnection;

module.exports = {
    connectToServer: function (callback) {
      client.connect(function (err, db) {
        if (err || !db) {
          return callback(err);
        }
  
        dbConnection = db.db(process.env.MONGO_DB_NAME);
        console.log("[DB] Successfully connected to MongoDB.");
  
        return callback();
      });
    },
  
    getDb: function () {
      return dbConnection;
    },
  };