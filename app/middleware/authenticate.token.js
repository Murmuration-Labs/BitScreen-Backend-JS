require('dotenv').config();
const jwt = require('jsonwebtoken');

const TOKEN_GENERATION_PATH = '/api/token'

// Autheticate users for all requests expect for generating JWT token
exports.authenticateToken = (req, res, next) => {

    let pathName = req._parsedUrl.pathname
    if (pathName === TOKEN_GENERATION_PATH) {
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
        req.user = user

        // move on from middleware
        next()
    })
}

