const express = require("express");
const router = express.Router();

const authenticateToken = require("../middlewares/auth");


router.put("/upload/useravatar", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const { img_header, img_data } = req.body;
    
        const decoded_data = window.decodeURIComponent(window.escape(window.btoa(img_data)));

        console.log("img header: ", img_header);
        console.log("img data: ", decoded_data);


        

        

    } catch(err) {
        res.status(401).send(JSON.stringify({message: `Error: ${err}`}));
    }
});

module.exports = router;