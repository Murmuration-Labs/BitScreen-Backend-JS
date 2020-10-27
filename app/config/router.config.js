const express = require('express');
const router = express.Router();
const bitscreen = require('../routes/bitscreen');

router.use('/payload-cid', bitscreen);

module.exports = router;