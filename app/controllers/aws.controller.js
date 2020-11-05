const s3 = require('../config/s3.config.js');
const {
  streamToString,
  formatS3UploadBody,
  parseCidList,
  isInList,
  parseRequestForCid,
  getParams,
  uploadParams
} = require('./utils')


const s3Client = s3.s3Client

const uploadToS3 = async (data) => {
  let body = formatS3UploadBody(data)
  const uploadParams = uploadParams(body)

  s3Client.upload(uploadParams, (err, data) => {
    if (err) {
      throw new Error(`Error with request to upload to S3 => ${err}`)
    } else {
      console.log("Uploaded to S3")
    }
  });
}

const addPayloadCid = async (payloadCid) => {

  const s3Stream = s3Client.getObject(getParams, (err, data) => {
    if (err) {
      if (err.code === 'NoSuchKey') {
        // app will crash because error 
        uploadToS3(payloadCid)
      } else {
        throw new Error(`Error with Request to get s3 object => ${err}`)
      }
    } else {
      console.log('Fetched S3 Object')
    }
  }).createReadStream()

  await streamToString(s3Stream).then(data => {
    let cidList = parseCidList(data)
    cidList.push(payloadCid)
    console.log("Uploading to S3")
    uploadToS3(cidList)
  }).catch(err => {
    throw new Error(err)
  })

}

const getS3Object = (req, res) => {
  const payloadCid = parseRequestForCid(req)
  if (!payloadCid) {
    res.status(400).json({ message: `Cannot find payload cid` })
  }

  s3Client.getObject(getParams, (err, data) => {
    if (err) {
      res.status(404).json({ message: `Error with Request to get s3 object => ${err.stack}` })
    } else {
      data ? res.status(200).json({ PayloadCid_Found: isInList(data, payloadCid) }) : res.status(400).json({ message: `Error => data not defined.` })
    }
  })
}
module.exports.uploadToS3 = uploadToS3;
module.exports.getS3Object = getS3Object;
module.exports.addPayloadCid = addPayloadCid;