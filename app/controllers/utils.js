const outdent = require('outdent');
const murmurationKeyName = require('../constants').MURMURATION_KEY_NAME
const env = require('../config/aws.env.js');

const removeFileExtension = ({ fileName }) => {
    return fileName.replace(/\.[^/.]+$/, "")
}

const parseCidList = (data) => {
    var objectData = data.Body ? data.Body.toString('utf-8') : data;
    let bitscreenObj = JSON.parse(outdent`${objectData}`)
    let cIdList = bitscreenObj["payloadCids"]

    return cIdList
}
const isInList = (data, payloadCid) => {
    let cIdList = parseCidList(data)

    return cIdList.includes(payloadCid)
}

const streamToString = async function asyncStreamToString(stream) {
    const chunks = []
    const s3String = new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk))
        stream.on('error', reject)
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    });
    return s3String
}

const parseRequestForCid = (req) => {
    return (req.body.Ref.Root["/"] ? req.body.Ref.Root["/"] : null)
}

const formatS3UploadBody = (data) => {
    const s3BodyObj = {
        metadata: {
            id: 1,
            name: 'Murmuration Bitscreen',
            description: "This is version 2 of a list of payload cids that should not be served on Filecoin's blockchain",
            owner: 1,
            createdAt: new Date(),
            version: 1,
            updateApi: 'v1',
            isMaintained: true
        },
        payloadCids: [],

    }
    if (typeof data === 'string') {
        s3BodyObj["payloadCids"] = [data]
        return JSON.stringify(s3BodyObj)
    } else {
        s3BodyObj["payloadCids"] = data
        return JSON.stringify(s3BodyObj)
    }
}

const getParams = {
    Bucket: env.AWS_BUCKET,
    Key: murmurationKeyName
}

const uploadParams = (body) => {
    return {
        Bucket: env.AWS_BUCKET,
        Key: murmurationKeyName,
        Body: body,
    }
};

module.exports.removeFileExtension = removeFileExtension;
module.exports.parseCidList = parseCidList;
module.exports.streamToString = streamToString;
module.exports.parseRequestForCid = parseRequestForCid;
module.exports.formatS3UploadBody = formatS3UploadBody;
module.exports.isInList = isInList;
module.exports.getParams = getParams;
module.exports.uploadParams = uploadParams;
