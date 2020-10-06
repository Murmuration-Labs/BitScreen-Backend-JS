let express = require('express');
let bitscreen = express.Router();
const dbWorker = require('../controllers/db.controller');
 
const awsWorker = require('../controllers/aws.controller');

bitscreen.post('/', awsWorker.uploadToS3);

// For now, there will be one S3 Object that will contain all CIDs
bitscreen.get('/', awsWorker.getS3Object);

// bitscreen.delete('/cid/:id', db.deleteBitscreen);

module.exports = bitscreen;