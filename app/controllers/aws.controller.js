const s3 = require('../config/s3.config.js');
const env = require('../config/s3.env.js');
 
exports.doUpload = (req, res) => {
  const s3Client = s3.s3Client;
  const params = s3.uploadParams;

  params.Key = req.file.originalname;
  params.Body = req.file.buffer;
    
  s3Client.upload(params, (err, data) => {
    err ? res.status(500).json({error:"Error: " + err}) :
    res.status(200).json({message: 'File uploaded successfully: keyname = ' + req.file.originalname})
  });
}

exports.getObject = (req, res) => {
    const s3Client = s3.s3Client;

    var getParams = {
      Bucket: env.Bucket,
      Key: req.query.file
    }

    s3Client.getObject(getParams, function(err, data) {

      if (err)
          return err;
  
    let objectData = data.Body.toString('utf-8'); // Use the encoding necessary
    res.status(200).json({message: 'File fetched successfully: keyname = ' + objectData})
    });
  };