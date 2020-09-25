const express = require('express');
const auth = require('./app/middleware/authenticate.token');
const router = require('./app/config/router.config');

const app = express();

// Add authentication middleware
app.use('/', auth.authenticateToken, router);

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, function () {
 
    let host = server.address().address
    let port = server.address().port
   
    console.log("App listening at http://%s:%s", host, port); 
  });