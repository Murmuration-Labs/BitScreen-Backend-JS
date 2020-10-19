const dynamoClient = require('../config/dynamoDB.config');
const addToS3 = require('../controllers/aws.controller');

const putItem = async (putParams) => {
    const item = dynamoClient.put(putParams, (err, data) => {
    if (err) {
        new Error(`Error with Request to add item => ${err}`)
    } else {
        console.log(`Adding item... => ${JSON.stringify(data.Item)}`)
        addToS3.addPayloadCid(putParams.Item["payload_content_id"]).then(result => console.log('Successfully added to s3')).catch(err => { new Error(`S3 Error => ${err}`) })
    }
    }).promise();

    return item
}

module.exports = putItem;