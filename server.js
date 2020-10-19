// Set globally for any missed handlers of local errors
process.on('unhandledRejection', (reason, p) => { throw reason });

const express = require('express');
const router = require('./app/config/router.config');

const app = express();

const bodyParser = express.json();

app.use('/api/v1', bodyParser, router);

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, function () {

    let host = server.address().address
    let port = server.address().port
   
    console.log("App listening at http://%s:%s", host, port); 
  });