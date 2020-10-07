const express = require('express');
const bitscreen = express.Router();
const awsWorker = require('../controllers/aws.controller');

bitscreen.post('/', awsWorker.checkCid);

// For now, there will be one S3 Object that will contain all CIDs
bitscreen.get('/', awsWorker.getS3Object);

module.exports = bitscreen;