const dynamoClient = require('../config/dynamoDB.config');

const putItem = async (putParams) => {
    const item = await dynamoClient.put(putParams, (err, data) => {
    if (err) {
        console.log(err)
            return err
    } else {
        console.log(`Adding item... => ${JSON.stringify(data.Item)}`)
    }
    }).promise();

    return item
}

module.exports = putItem;