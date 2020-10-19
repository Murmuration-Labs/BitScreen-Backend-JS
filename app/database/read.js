const dynamoClient = require('../config/dynamoDB.config');


const getItem = async (getParams) => {
    const item = dynamoClient.get(getParams, (err, data) => {
    if (err) {
        console.log(`Error with Request to Get Item => ${err}`)
    } else {
        data.Item ? console.log(`Fetching item... => ${JSON.stringify(data.Item)}`) : console.log(`Item not found in DynamoDB table`)
    }
    }).promise();

    return item
}

module.exports = getItem;