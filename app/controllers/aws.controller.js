const s3 = require('../config/s3.config.js');
const env = require('../config/aws.env.js');
const {
  stringToArray,
  checkContentIds,
  streamToString,
  formatS3UploadBody,
} = require('./utils')
const MURMURATION_KEY_NAME = 'test-murmuration-bitscreen.json';


uploadToS3 = async ( data ) => {
  const s3Client = s3.s3Client;
  const params = s3.uploadParams;

  params.Key = MURMURATION_KEY_NAME;
  params.Body = formatS3UploadBody(data)

  s3Client.upload(params, (err, data) => {
    if (err) {
      throw new Error(`Error with request to upload to S3 => %{err}`) 
    } else {
      console.log("Uploaded to S3")
    }
  });
}

addPayloadCid = async ( payloadCid ) => {
  const keyName = MURMURATION_KEY_NAME
  const s3Client = s3.s3Client;

  const getParams = {
    Bucket: env.Bucket,
    Key: keyName
  }

  const s3Stream = s3Client.getObject(getParams, (err, data) => {
      if (err) {
        throw new Error(`Error with Request to get s3 object => ${err}`)
      } else {
        console.log('Fetched S3 Object')
      }
    }).createReadStream()

  await streamToString(s3Stream).then(data => {

    let contentIds = stringToArray(data)
    let messageObj = checkContentIds({ contentIds, payloadCid })
    
    if (messageObj["message"].includes('No matches found.')) {
      
    contentIds.push(payloadCid)
    console.log("Uploading to S3")
    uploadToS3(contentIds)
    }
  }).catch(err => {
    throw new Error(err)
  })

}

getS3Object = (req, res) => {
  const keyName = MURMURATION_KEY_NAME
  const s3Client = s3.s3Client;

  const getParams = {
    Bucket: env.Bucket,
    Key: keyName
  }

  s3Client.getObject(getParams, (err, data) => {
      if (err) {
        res.status(500).json({message: `Error with Request to get s3 object => ${err.stack}`})
      } else {
        data ? res.status(200).json(stringToArray(data)) : res.status(400).json('Error => data is undefined')
      }
    });
}
module.exports.uploadToS3 = uploadToS3;
module.exports.getS3Object = getS3Object;
module.exports.addPayloadCid = addPayloadCid;