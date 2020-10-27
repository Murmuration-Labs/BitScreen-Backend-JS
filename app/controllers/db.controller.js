const getItem = require("../database/read");
const putItem = require("../database/write");
const isEmpty = require("lodash/isEmpty");
const { parseRequestForCid } = require('./utils');
const addToS3 = require('../controllers/aws.controller');


const addPayloadCid = async (req, res) => {
    try {
        const payloadCid = parseRequestForCid(req)
        if (!payloadCid) {
            throw new Error(`Error with Payload Cid => ${payloadCid}`)
        }

        const getParams = {
            TableName: "payload_content_ids",
            Key: {
                "payload_content_id": payloadCid,
            }
        }

        const getItemObj = await getItem(getParams)
            .then((result) => result)
            .catch(err => {
                let itemObj = err
                itemObj["isError"] = true
                // try throwing error here
                return itemObj
            });


        if (getItemObj["isError"]) {
            throw new Error(`Error with DyanmoDB Get Request => ${getItemObj}`)
        }
        // If empty, we want to create it
        if (isEmpty(getItemObj)) {
            const input = {
                "payload_content_id": payloadCid, "created_at": new Date().toISOString()
            }

            const putParams = {
                TableName: "payload_content_ids",
                Item: input,
            }
            await putItem(putParams)
                .then(result => {
                    console.log(`Successfully added item to DynamoDB table => ${JSON.stringify(result)}`)
                }).catch(err => {
                    throw new Error(`Error with DyanmoDB Put Request => ${err}`)
                })
            // If fails to update S3 file then payload Cid will exist in DynamoDB and not in S3
            // TODO: If S3 fails, update S3 based on
            await addToS3.addPayloadCid(putParams.Item["payload_content_id"])
                .then(result => console.log('Successfully added to s3'))
                .catch(err => { throw new Error(`S3 Error => ${err}`) })

            res.status(200).json({ message: `Successfully Added New Payload Cid => ${payloadCid}` })
        } else {
            res.status(200).json({ message: `Payload Cid Already Exists: ${payloadCid}` })
        }
    } catch (error) {
        res.status(404).json({ message: `${error.message}` })
    }
}

const getPayloadCid = async (req, res) => {
    try {
        const payloadCid = parseRequestForCid(req);
        const getParams = {
            TableName: "payload_content_ids",
            Key: {
                "payload_content_id": payloadCid,
            }
        }
        const getItemObj = await getItem(getParams).then((result) => result).catch(err => {
            let itemObj = err
            itemObj["isError"] = true

            return itemObj
        }).finally('Done')

        if (getItemObj["isError"]) {
            throw new Error(`Error with DyanmoDB Get Request => ${getItemObj}`)
        } else if (isEmpty(getItemObj)) {
            res.status(200).json({ message: `Payload Cid Not Found: ${payloadCid}` })
        } else {
            res.status(200).json({ message: `Successfully fetched Payload Cid: ${payloadCid}` })
        }
    } catch (error) {
        res.status(404).json({ message: `${error.message}` })
    }
}

module.exports.addPayloadCid = addPayloadCid;
module.exports.getPayloadCid = getPayloadCid;