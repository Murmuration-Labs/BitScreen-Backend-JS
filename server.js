const express = require('express');
const router = require('./api/config/router.config');

const app = express();

app.use('/', router);

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, function () {
 
    let host = server.address().address
    let port = server.address().port
   
    console.log("App listening at http://%s:%s", host, port); 
  });