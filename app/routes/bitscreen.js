const express = require('express');
const bitscreen = express.Router();
const awsWorker = require('../controllers/aws.controller');
const dbWorker = require('../controllers/db.controller');

// bitscreen.post('/', awsWorker.checkCid);

bitscreen.post('/', dbWorker.addPayloadCid);

// For now, there will be one S3 Object that will contain all CIDs
bitscreen.get('/', awsWorker.getS3Object);
// bitscreen.get('/', dbWorker.getPayloadCId);

module.exports = bitscreen;