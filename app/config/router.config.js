const express = require('express');
const router = express.Router({mergeParams: true});
// const auth = require('../routes/auth');
const blocklist = require('../routes/blocklist');

// router.use('/api/auth/miner/:minerId', auth);
router.use('/api/blocklist', blocklist);

module.exports = router;