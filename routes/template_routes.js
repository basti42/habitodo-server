const express = require("express");
const router = express.Router();

const dbConnection = require("../database/connection");
const mongo = require("mongodb");

const authenticateToken = require("../middlewares/auth");


router.get("/metrics", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');

        const db = dbConnection.getDb();
        db.collection("app-templates")
            .find({})
            .limit(10)
            .toArray((err, result) => {
                if (err) {
                    res.status(400).send(JSON.stringify({message: "Error retrieving metrics"}));
                } else {
                    res.send(JSON.stringify(result));
                }
            })

    } catch (error){

    }
});



module.exports = router;