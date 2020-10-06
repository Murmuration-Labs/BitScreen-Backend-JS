const s3 = require('../config/s3.config.js');
const env = require('../config/s3.env.js');
const { stringToArray, checkContentIds } = require('./utils')
const string2fileStream = require('string-to-file-stream');
const assert = require('assert');
 

exports.uploadToS3 = (req, res) => {
  const bitscreenId = req.body.BitscreenId ? req.body.BitscreenId : null
  const contentIdArr = req.body.ContentId ? req.body.ContentId : null

  const keyName = bitscreenId+'.json'
  const s3Client = s3.s3Client;
  const params = s3.uploadParams;

  params.Key = keyName;
  params.Body = JSON.stringify(contentIdArr);

  s3Client.upload(params, (err, data) => {
    err ? res.status(500).json({error:"Error: " + err}) :
    res.status(200).json({message: 'File uploaded successfully: keyname = ' + keyName})
  });
}

exports.getS3Object = ( req, res ) => {
  const bitscreenId = req.body.BitscreenId ? req.body.BitscreenId : null
  const contentIdArr = req.body.ContentId ? req.body.ContentId : null

  const keyName = bitscreenId+'.json'
  const s3Client = s3.s3Client;
  
  var getParams = {
    Bucket: env.Bucket,
    Key: keyName
  }

  contentIds = s3Client.getObject(getParams, (err, data) => {

    if (err) {
      res.status(400).json({message: `Bad Request => error => ${err}`});
    }
    
    let contentIds = stringToArray({ data })
    let messageObj = checkContentIds({ contentIds, contentIdArr })
    
    res.status(200).json(messageObj)
  });
};

exports.modifyS3Object = (req, res) => {
  const s3Client = s3.s3Client;
  const keyName = req.query.blocklist

  const getParams = {
    Bucket: env.Bucket,
    Key: keyName

  }
  const contentId = req.query.cid
  const s = string2fileStream(contentId)
  s.on('data', (chunk) => {
    assert.equal(chunk.toString(), contentId);
  });
  // var cIdBuffer = Buffer.from(contentId, 'utf-8');
  // Get blocklist JSON file and return parse list
  s3Client.getObject(getParams, (err, data) => {
      if (err) {
        return res.status(400).json({message: `Bad Request => error => ${err}`});
      }
      let contentList = stringToArray({data})
      
  });

  const uploadParams = s3.uploadParams;
  uploadParams.Key = keyName
  
  uploadParams.Body = newContentListBuffer
  // Upload new buffer
  s3Client.upload(params, (err, data) => {
    err ? res.status(500).json({error:"Error: " + err}) :
    res.status(200).json({message: 'File uploaded successfully: keyname = ' + keyName})
  });
}