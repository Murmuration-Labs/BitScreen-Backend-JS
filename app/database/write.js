const dynamoDB = require('../config/dynamoDB.config');


const putPayloadCID = (res, payloadCID ) => {
    const input = {
        "payload_content_id": payloadCID, "created_at": new Date().toISOString()
    }
    
    const putParams = {
        TableName: "payload_content_ids",
        Item: input
    }
    
    dynamoDB.put(putParams, (err, data) => {
        if (err) {
            return res.sendStatus(500)
        }
        res.sendStatus(200)
    });
}

module.exports = putPayloadCID;