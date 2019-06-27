var MongoClient = require('mongodb').MongoClient;
var _db, _client;

exports.connect = async (callback) => {
	// Connect to MongoDB and set client and db vars
	_client = new MongoClient("mongodb://localhost:27017/apollodb?replicaSet=rs0");
	callback(await _client.connect()
	.then(() => {
		_db = _client.db('apollodb')
	})
	.catch((err) => err))
};

// Export db and client for ease of use
exports.db = () => _db;
exports.client = () => _client;
