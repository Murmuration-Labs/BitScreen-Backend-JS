let express = require('express');
let bitscreens = express.Router();
let db = require('../config/dynamodb.config')

bitscreens.get('/', db.getBitscreens);

module.exports = bitscreens;