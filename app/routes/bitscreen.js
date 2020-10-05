let express = require('express');
let bitscreen = express.Router();
let db = require('../config/dynamodb.config')
// let upload = require('../config/multer.config');
 
// const awsWorker = require('../controllers/aws.controller');

bitscreen.post('/cid/:id', db.addBitscreen);

bitscreen.get('/', db.getBitscreen);

bitscreen.patch('/', db.patchBitscreen);

bitscreen.patch('/cid/:id', db.patchCID);

bitscreen.delete('/cid/:id', db.deleteBitscreen);

module.exports = bitscreen;