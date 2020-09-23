const express = require('express');

const app = express();

let router = require('./app/routers/upload.router.js');
app.use('/', router);

const PORT = process.env.PORT || 5000

// app.listen(PORT, err => err ? console.log(`Error: ${err}`) : console.log(`Server started on port: ${PORT}`));

const server = app.listen(PORT, function () {
 
    let host = server.address().address
    let port = server.address().port
   
    console.log("App listening at http://%s:%s", host, port); 
  });