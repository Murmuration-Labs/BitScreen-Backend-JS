const outdent = require('outdent');

const removeFileExtension = ({ fileName }) => {
    return fileName.replace(/\.[^/.]+$/, "")
}

const stringToArray = ({ data }) => {
    objectData = data.Body ? data.Body.toString('utf-8') : data;
    let cIdList = JSON.parse(outdent`${objectData}`)

    return cIdList
}

const checkContentIds = ({ contentIds, payloadCid }) => {
    let match = payloadCid ? contentIds.find(cId => cId === payloadCid) : null

    let messageObj = {
        message: match ? `Match Found! ${match}` : 'No matches found.'
    }

    return messageObj
}

const streamToString = async function asyncStreamToString(stream) {
    const chunks = []
    const s3String = new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    });
    return await s3String
  }

const parseRequestForCid = ( req ) => {
    return (req.body.Ref.Root["/"] ? req.body.Ref.Root["/"] : null)
  }
  
const formatS3UploadBody = ( data ) => {
    if (typeof data === 'string') {
      return JSON.stringify([data])
    } else {
      return JSON.stringify(data)
    }
}

module.exports.removeFileExtension = removeFileExtension;
module.exports.stringToArray = stringToArray;
module.exports.checkContentIds = checkContentIds;
module.exports.streamToString = streamToString;
module.exports.parseRequestForCid = parseRequestForCid;
module.exports.formatS3UploadBody = formatS3UploadBody;