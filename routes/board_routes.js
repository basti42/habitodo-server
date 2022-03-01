require("dotenv").config();

const express = require("express");
const mongo = require("mongodb");
const dbConnection = require("../database/connection");

const simpleCrypto = require("../helpers/simple_crypto");
const authenticateToken = require("../middlewares/auth");

const router = express.Router();

router.get("/:id", authenticateToken, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const encrypted_board_id = req.params.id;
    const decoded_board_id = simpleCrypto.decipher(encrypted_board_id);
    const db = dbConnection.getDb();

    db.collection("app-boards").findOne({_id: new mongo.ObjectId(decoded_board_id)})
        .then( board => {
            console.log("Retrieved Board: ", board);
            console.log("User ID: ", req.decoded_token.user_id);
            res.send(JSON.stringify({board}));
        })
        .catch( err => {
            console.error(err);
            res.status(401).send(JSON.stringify({message: err}));
        });
});


router.post("/add", authenticateToken, (req, res) => {
    const {topic, description, moderators, participants, team_id} = req.body;
    res.setHeader('Content-Type', 'application/json');

    const db = dbConnection.getDb();
    db.collection("app-boards").insertOne({topic, description, moderators, participants, team_id})
        .then( insert_result => {
            const board_id = insert_result.insertedId.toString("hex");
            const encrypted_board_id = simpleCrypto.cipher(board_id);
            res.send(JSON.stringify({board_id: encrypted_board_id}));            
        })
        .catch( err => {
            console.error(err);
            res.status(403).send(JSON.stringify({message: err}));
        });
});



module.exports = router;