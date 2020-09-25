let express = require('express');
let cid = express.Router();
let upload = require('../config/multer.config');
 
const awsWorker = require('../controllers/aws.controller');

cid.post('/', upload.single("file"), awsWorker.doUpload);

cid.get('/', awsWorker.getObject);
 
module.exports = cid;