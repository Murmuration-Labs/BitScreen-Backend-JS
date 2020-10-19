const dynamoClient = require('../config/dynamoDB.config');

const putItem = async (putParams) => {
    const item = dynamoClient.put(putParams, (err, data) => {
    if (err) {
        new Error(`Error with Request to add item => ${err}`)
    } else {
        console.log(`Adding item... => ${JSON.stringify(data.Item)}`)
    }
    }).promise();

    return item
}

module.exports = putItem;