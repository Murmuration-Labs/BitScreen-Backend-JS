const s3 = require('../config/s3.config.js');
const env = require('../config/s3.env.js');
const {
  stringToArray,
  checkContentIds,
  streamToString,
  parseRequestForCid,
  formatS3UploadBody,
} = require('./utils')
const MURMURATION_KEY_NAME = 'test-murmuration-bitscreen.json';


uploadToS3 = ( data, res ) => {
  const s3Client = s3.s3Client;
  const params = s3.uploadParams;

  params.Key = MURMURATION_KEY_NAME;
  params.Body = formatS3UploadBody(data)

  s3Client.upload(params, (err, data) => {
    err ? res.status(500).json({error:"Error: " + err}) :
    res.status(200).json({message: 'File uploaded successfully: keyname = ' + params.Key})
  });
}

getS3Object = ( req, res ) => {
  const keyName = MURMURATION_KEY_NAME
  const s3Client = s3.s3Client;
  
  var getParams = {
    Bucket: env.Bucket,
    Key: keyName
  }

  s3Client.getObject(getParams, (err, data) => {

    if (err) {
      res.status(400).json({message: `Bad Request => error => ${err}`});
    } else {
      let contentIds = stringToArray({ data })
      res.status(200).json(contentIds)
    }
  });
};

checkCid = ( req, res ) => {
  const payloadCid = parseRequestForCid(req)
  const keyName = MURMURATION_KEY_NAME
  const s3Client = s3.s3Client;

  const getParams = {
    Bucket: env.Bucket,
    Key: keyName

  }
  const s3Stream = s3Client.getObject(getParams, (err, data) => {

    if (err) {
      if (err.code === 'NoSuchKey') {
        uploadToS3(payloadCid, res)
        return
      } else {
        res.status(400).json({message: `Bad Request => error => ${err}`});
      }
    }

  }).createReadStream();
  
  streamToString(s3Stream).then(data => {

    let contentIds = stringToArray({ data })
    let messageObj = checkContentIds({ contentIds, payloadCid })
    
    if (messageObj["message"].includes('No matches found.')) {
      
      contentIds.push(payloadCid)
      uploadToS3(contentIds, res)
      return 
    } else {
      res.status(200).json(messageObj)
    }
  })
}

module.exports.uploadToS3 = uploadToS3;
module.exports.getS3Object = getS3Object;
module.exports.checkCid = checkCid;