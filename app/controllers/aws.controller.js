const s3 = require('../config/s3.config.js');
const env = require('../config/s3.env.js');
const { stringToArray, checkContentIds, streamToString } = require('./utils')
const string2fileStream = require('string-to-file-stream');

uploadToS3 = (req, res) => {
  const payloadCid = req.body.Ref.Root["/"] ? req.body.Ref.Root["/"] : null

  const keyName = 'test-murmuration-bitscreen.json'
  const s3Client = s3.s3Client;
  const params = s3.uploadParams;

  params.Key = keyName;
  params.Body = JSON.stringify([payloadCid]);

  s3Client.upload(params, (err, data) => {
    err ? res.status(500).json({error:"Error: " + err}) :
    res.status(200).json({message: 'File uploaded successfully: keyname = ' + keyName})
  });
}

getS3Object = ( req, res ) => {
  const payloadCid = req.body.Ref.Root["/"] ? req.body.Ref.Root["/"] : null

  const keyName = 'test-murmuration-bitscreen.json'
  const s3Client = s3.s3Client;
  
  var getParams = {
    Bucket: env.Bucket,
    Key: keyName
  }

  s3Client.getObject(getParams, (err, data) => {

    if (err) {
      res.status(400).json({message: `Bad Request => error => ${err}`});
    }
    
    let contentIds = stringToArray({ data })
    console.log(contentIds, payloadCid)
    let messageObj = checkContentIds({ contentIds, payloadCid })
    
    res.status(200).json(messageObj)
  });
};

modifyS3Object = (req, res) => {
  const payloadCid = req.body.Ref.Root["/"] ? req.body.Ref.Root["/"] : null

  const keyName = 'test-murmuration-bitscreen.json'
  const s3Client = s3.s3Client;

  const getParams = {
    Bucket: env.Bucket,
    Key: keyName

  }
  const s3Stream = s3Client.getObject(getParams, (err, data) => {

    if (err) {
      res.status(400).json({message: `Bad Request => error => ${err}`});
    }

  }).createReadStream();
  
  var newString = streamToString(s3Stream)
  res.status(200).send(newString)
  // const uploadParams = s3.uploadParams;
  // uploadParams.Key = keyName
  
  // uploadParams.Body = newContentListBuffer
  // // Upload new buffer
  // s3Client.upload(params, (err, data) => {
  //   err ? res.status(500).json({error:"Error: " + err}) :
  //   res.status(200).json({message: 'File uploaded successfully: keyname = ' + keyName})
  // });
}

module.exports.uploadToS3 = uploadToS3;
module.exports.getS3Object = getS3Object;
module.exports.modifyS3Object = modifyS3Object;