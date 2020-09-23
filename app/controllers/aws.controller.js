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