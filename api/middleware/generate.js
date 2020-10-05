// require('dotenv').config();
// const jwt = require('jsonwebtoken');

// exports.generateAccessToken = (req, res) => {
//     let url = req.baseUrl
//     const minerId = url.substring(url.lastIndexOf('/') + 1)
//     // Check if real Filecoin Miner/Peer Id
//     let filecoinMiner = minerId.startsWith('t0')
    
//     const miner = filecoinMiner ? {
//         minerId: minerId
//     } : null
    
//     if (miner === null){
//         res.status(404).json({
//             message: 'User Not Found or User Not Given'
//         })
//     }
//     // expiresIn set to be expressed in seconds. E.g. token expires in 15 minutes
//     const accessToken = jwt.sign(miner, process.env.JWT_KEY, { expiresIn: '900s'})
//     res.status(201).json( { 
//         accessToken: accessToken,
//         message: 'Access Token Created!' 
//     });
// }