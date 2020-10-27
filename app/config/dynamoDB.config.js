const AWS = require('aws-sdk');

AWS.config.update({ region: process.env.AWS_REGION || "us-west-1" });

const dynamoDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

module.exports = dynamoDB;