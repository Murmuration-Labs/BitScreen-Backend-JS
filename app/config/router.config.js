const express = require('express');
const router = express.Router({mergeParams: true});
const bitscreen = require('../routes/bitscreen');

router.use('/bitscreen', bitscreen);

module.exports = router;