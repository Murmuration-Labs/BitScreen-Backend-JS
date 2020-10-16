const getItem = require("../database/read");
const putItem = require("../database/write");
const isEmpty = require("lodash/isEmpty");
const { parseRequestForCid } = require('./utils');


addPayloadCId = async (req, res) => {
    try {
        const payloadCId = parseRequestForCid(req)
        if (!payloadCId) {
            throw new Error(`Error with Payload Cid => ${payloadCId}`)
        }

        const getParams = {
            TableName: "payload_content_ids",
            Key: {
                "payload_content_id": payloadCId,
            }
        }

        const getItemObj = await getItem(getParams).then((result) => result).catch(err => {
            let itemObj = err
            itemObj["isError"] = true
            
            return itemObj
        }).finally('Done')
        
  
        if (getItemObj["isError"]) {
            throw new Error(`Error with DyanmoDB Get Request => ${getItemObj}`)
        }

        if (isEmpty(getItemObj)) {
            const input = {
                "payload_content_id": payloadCId, "created_at": new Date().toISOString()
            }
            
            const putParams = {
                TableName: "payload_content_ids",
                Item: input,
            }

            let putItemObj = await putItem(putParams).then(result => result).catch(err => {
                let itemObj = err
                itemObj["isError"] = true
                
                return itemObj
            }).finally('Done')

            if (putItemObj["isError"]) {
                throw new Error(`Error with DyanmoDB Put Request => ${putItemObj}`)
            }
            res.status(200).json({message: `Successfully added item => Payload Cid: ${payloadCId}`})
        } else {
            res.status(200).json({message: `Payload Cid Already Exists: ${payloadCId}`})
        }
    } catch(error) {
        res.status(404).json({message:`${error.message}`})
    }
}

getPayloadCId = async (req, res) => {
    try {
        const payloadCId = parseRequestForCid(req);
        const getParams = {
            TableName: "payload_content_ids",
            Key: {
                "payload_content_id": payloadCId,
            }
        }
        const getItemObj = await getItem(getParams).then((result) => result).catch(err => {
            let itemObj = err
            itemObj["isError"] = true
            
            return itemObj
        }).finally('Done')
        
        if (getItemObj["isError"]) {
            throw new Error(`Error with DyanmoDB Get Request => ${getItemObj}`)
        } else {
            res.status(200).json({message: `Successfully fetched Payload Cid: ${payloadCId}`})
        }
    } catch (error) {
        res.status(404).json({message:`${error.message}`})
    }
}

module.exports.addPayloadCId = addPayloadCId;
module.exports.getPayloadCId = getPayloadCId;

