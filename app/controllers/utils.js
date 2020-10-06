const outdent = require('outdent');

const removeFileExtension = ({ fileName }) => {
    return fileName.replace(/\.[^/.]+$/, "")
}

const stringToArray = ({ data }) => {
    objectData = data.Body.toString('utf-8');
    let cIdList = JSON.parse(outdent`${objectData}`)

    return cIdList
}

const checkContentIds = ({ contentIds, contentIdArr }) => {
    let match = contentIdArr ? contentIds.find(cId => contentIdArr.includes(cId)) : null

    let messageObj = {
        message: match ? `Match Found! ${match}` : 'No matches found.'
    }

    return messageObj
}

module.exports.removeFileExtension = removeFileExtension;
module.exports.stringToArray = stringToArray;
module.exports.checkContentIds = checkContentIds;