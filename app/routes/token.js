let express = require('express');
let token = express.Router();
let auth = require('../middleware/generate.token');

token.post('/', auth.generateAccessToken)

module.exports = token;
