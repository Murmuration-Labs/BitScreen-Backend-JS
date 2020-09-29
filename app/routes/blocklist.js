let express = require('express');
let blocklist = express.Router();
let upload = require('../config/multer.config');
 
const awsWorker = require('../controllers/aws.controller');

blocklist.post('/', upload.single("file"), awsWorker.createBlocklist);

blocklist.put('/', awsWorker.updateBlocklist);

blocklist.get('/', awsWorker.readBlocklist);
 
module.exports = blocklist;