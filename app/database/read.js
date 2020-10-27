const dynamoClient = require('../config/dynamoDB.config');


const getItem = async (getParams) => {
    return (
        dynamoClient.get(getParams, (err, data) => {
            if (err) {
                console.error(`Error with Request to Get Item => ${err}`);
            } else {
                data.Item ? console.log(`Fetching item... => ${JSON.stringify(data.Item)}`) : console.log(`Item not found in DynamoDB table`)
            }
        }).promise()
    )
}

module.exports = getItem;