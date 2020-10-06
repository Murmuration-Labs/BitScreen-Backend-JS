exports.insertBitscreen = ( req, res ) => {
    const bitscreenId = req.body.BitscreenId
    const contentId = req.body.ContentId

    // Check if contentId exists
        // db.read(contentId)
    // If contentId does exists
        // db.insert(contentId)
        // Update S3 Object
        // Respond with confirmation of newly inserted contentId

    res.status(200).json({message: `hello, `});
};