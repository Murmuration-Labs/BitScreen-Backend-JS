const s3 = require('../config/s3.config.js');
const env = require('../config/s3.env.js');
const { removeFileExtension, stringToArray, checkContentIds } = require('./utils')
 

exports.createBlocklist = (req, res) => {
  const s3Client = s3.s3Client;

  let keyName = removeFileExtension({fileName: req.file.originalname})

  const params = s3.uploadParams;

  params.Key = keyName;
  params.Body = req.file.buffer;


  s3Client.upload(params, (err, data) => {
    err ? res.status(500).json({error:"Error: " + err}) :
    res.status(200).json({message: 'File uploaded successfully: keyname = ' + keyName})
  });
  // add cid to json file if any
}

exports.updateBlocklist = (req, res) => {
  const s3Client = s3.s3Client;

  const getParams = {
    Bucket: env.Bucket,
    Key: req.query.blocklist
  }

  
  const contentIds = s3Client.getObject(getParams, (err, data) => {
      if (err) {
        return res.status(400).json({message: `Bad Request => error => ${err}`});
      }
        
      return stringToArray({ data })
  })
  const uploadParams = s3.uploadParams;
  params.Key = keyName
  params.Body = contentIds

  s3Client.upload(params, (err, data) => {
    err ? res.status(500).json({error:"Error: " + err}) :
    res.status(200).json({message: 'File uploaded successfully: keyname = ' + keyName})
  })

  // add or remove cid
}

exports.readBlocklist = (req, res) => {
    const s3Client = s3.s3Client;
    const contentId = req.query.cid

    var getParams = {
      Bucket: env.Bucket,
      Key: req.query.blocklist
    }
    
    s3Client.getObject(getParams, (err, data) => {

      if (err) {
        res.status(400).json({message: `Bad Request => error => ${err}`});
      }
      
      let contentIds = stringToArray({ data })
      let messageObj = checkContentIds({ contentIds, contentId })

      res.status(200).json(messageObj)

    });

  };