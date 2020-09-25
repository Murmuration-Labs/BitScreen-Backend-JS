const express = require('express');
const router = express.Router();
const token = require('../routes/token');
const cid = require('../routes/cid');

router.use('/api/token', token);
router.use('/api/cid', cid);

module.exports = router;