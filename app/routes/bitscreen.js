const express = require('express');
const bitscreen = express.Router();
const awsWorker = require('../controllers/aws.controller');

bitscreen.post('/', awsWorker.uploadToS3);

// For now, there will be one S3 Object that will contain all CIDs
bitscreen.get('/', awsWorker.getS3Object);

bitscreen.patch('/', awsWorker.modifyS3Object);

module.exports = bitscreen;