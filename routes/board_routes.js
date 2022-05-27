require("dotenv").config();

const express = require("express");
const mongo = require("mongodb");
const dbConnection = require("../database/connection");

const simpleCrypto = require("../helpers/simple_crypto");
const authenticateToken = require("../middlewares/auth");

const router = express.Router();

// router.get("/:id", authenticateToken, (req, res) => {
//     res.setHeader('Content-Type', 'application/json');
//     const encrypted_board_id = req.params.id;
//     const decoded_board_id = simpleCrypto.decipher(encrypted_board_id);
//     const db = dbConnection.getDb();

//     db.collection("app-boards").findOne({_id: new mongo.ObjectId(decoded_board_id)})
//         .then( board => {
//             // console.log("Retrieved Board: ", board);
//             // console.log("User ID: ", req.decoded_token.user_id);
//             res.send(JSON.stringify({board}));
//         })
//         .catch( err => {
//             console.error(err);
//             res.status(401).send(JSON.stringify({message: err}));
//         });
// });


router.put("/", authenticateToken, (req, res) => {
    const {topic, description, isPublic, participants, moderators, emails, team} = req.body;
    res.setHeader('Content-Type', 'application/json');

    const db = dbConnection.getDb();
    db.collection("app-boards").insertOne(
        {
            topic, 
            description, 
            board_id: "", 
            moderators: [ req.decoded_token.user_id ], 
            participants, 
            team_id
        }).then( insert_result => {
            const board_id = insert_result.insertedId.toString("hex");
            const encrypted_board_id = simpleCrypto.cipher(board_id);
            // TODO is it necessary to add board_id to users boards?

            // add the encrypted board id to the board object
            db.collection("app-boards").findOneAndUpdate({_id: new mongo.ObjectId(board_id)}, { $set: { board_id: encrypted_board_id }});

            res.send(JSON.stringify({board_id: encrypted_board_id}));            
        })
        .catch( err => {
            console.error(err);
            res.status(403).send(JSON.stringify({message: err}));
        });
});


router.get("/get/:board_id", authenticateToken, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const board_id = req.params.board_id;
    const db = dbConnection.getDb();
    db.collection("app-boards").findOne({board_id})
        .then( board => {
            delete board._id; // drop the actual, unencrypted _id from the board. only use the encrypted board_id.
            res.send(JSON.stringify(board));
        })
        .catch( err => {
            console.error(err);
            res.status(403).send(JSON.stringify({message: err}));
        });
});

router.get("/get", authenticateToken, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const db = dbConnection.getDb();

    const userToken = req.decoded_token.user_id;
    db.collection("app-boards").find({ $or: [ { moderators: { $in: [ userToken ]} }, { participants: { $in: [ userToken ]} } ]}).toArray()
        .then( boards => { 
            // console.debug("num of found documents: ", boards.length);
            // remove actual id from the board so to only search for it by encrypted board_id
            boards.forEach(element => { delete element._id; });
            res.send(JSON.stringify(boards)); 
        })
        .catch( err => { 
            console.error(err);
            res.status(403).send(JSON.stringify({message: err})); 
        });
});

module.exports = router;