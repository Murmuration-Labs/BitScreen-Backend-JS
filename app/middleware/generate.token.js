require('dotenv').config();
const jwt = require('jsonwebtoken');

exports.generateAccessToken = (req, res) => {
    
    const user = req.query.userId ? {
        userId: req.query.userId
    } : null
    
    if (user === null){
        res.status(404).json({
            message: 'User Not Found or User Not Given'
        })
    }

    const accessToken = jwt.sign(user, process.env.JWT_KEY)
    res.status(201).json( { 
        accessToken: accessToken,
        message: 'Access Token Created!' 
    });
}