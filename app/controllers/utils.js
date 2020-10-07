const outdent = require('outdent');

const removeFileExtension = ({ fileName }) => {
    return fileName.replace(/\.[^/.]+$/, "")
}

const stringToArray = ({ data }) => {
    objectData = data.Body.toString('utf-8');
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

const streamToString = (stream) => {
    const chunks = []
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    });
  }

module.exports.removeFileExtension = removeFileExtension;
module.exports.stringToArray = stringToArray;
module.exports.checkContentIds = checkContentIds;
module.exports.streamToString = streamToString;