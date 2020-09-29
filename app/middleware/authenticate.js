require('dotenv').config();
const jwt = require('jsonwebtoken');

const AUTH_PATH_TYPE = 'auth'

// Autheticate users for all requests expect for generating JWT token
exports.authenticateToken = (req, res, next) => {
    
    let pathName = req._parsedUrl.pathname
    let pathType = pathName.split('/')[2]
    
    if (pathType === AUTH_PATH_TYPE) {
        next()
    }
    
    let authHeaders = req.headers['authorization']
    let token = authHeaders && authHeaders.split(' ')[1]
    if (token == null ) {
        return res.sendStatus(401)
    }

    jwt.verify(token, process.env.JWT_KEY, (err, user) => {
        if (err) {
            return res.sendStatus(403)
        }

        req.miner = user

        // move on from middleware
        next()
    })
}

