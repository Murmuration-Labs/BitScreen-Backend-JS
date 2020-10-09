const getPayloadCID = require("../database/read");
const putPayloadCID = require("../database/write");
const {
    parseRequestForCid,
  } = require('./utils');

postFunction = (req, res) => {
    const payloadCID = parseRequestForCid(req);
    putPayloadCID(res, payloadCID)
}

getFunction = (req, res) => {
    const payloadCID = parseRequestForCid(req);
    getPayloadCID(res, payloadCID)
}

module.exports.postFunction = postFunction;
module.exports.getFunction = getFunction;

