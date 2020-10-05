const express = require('express');
const router = express.Router({mergeParams: true});
// const auth = require('../routes/auth');
const bitscreen = require('../routes/bitscreen');
const bitscreens = require('../routes/bitscreens');

// router.use('/api/auth/miner/:minerId', auth);
router.use('/bitscreen/:id/', bitscreen)
router.use('/bitscreens', bitscreens)

module.exports = router;