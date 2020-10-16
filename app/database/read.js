const dynamoClient = require('../config/dynamoDB.config');


const getItem = async (getParams) => {
    const item = await dynamoClient.get(getParams, (err, data) => {
    if (err) {
        const error = `Error with Request to Get Item => ${err}`
        return error
    } else {
        console.log(`Fetching item... => ${JSON.stringify(data.Item)}`)
    }
    }).promise();

    return item
}

module.exports = getItem;