const dynamoClient = require('../config/dynamoDB.config');


const getPayloadCID = (res, payloadCID) => {
    const getParams = {
        TableName: "payload_content_ids",
        Key: {
            "payload_content_id": payloadCID,
        }
    }
    
    dynamoClient.get(getParams, (err, data) => {
        if (err) {
            return res.sendStatus(500)
        }
        res.sendStatus(200)
    });
}

module.exports = getPayloadCID;