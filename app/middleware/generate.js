require('dotenv').config();
const jwt = require('jsonwebtoken');

exports.generateAccessToken = (req, res) => {
    let url = req.baseUrl
    const minerId = url.substring(url.lastIndexOf('/') + 1)
    // Check if last index is an real Fielcoin id
    let filecoinMiner = minerId.includes('t0') && (minerId.length == 6)
    const miner = filecoinMiner ? {
        minerId: minerId
    } : null
    
    if (miner === null){
        res.status(404).json({
            message: 'User Not Found or User Not Given'
        })
    }

    const accessToken = jwt.sign(miner, process.env.JWT_KEY)
    res.status(201).json( { 
        accessToken: accessToken,
        message: 'Access Token Created!' 
    });
}