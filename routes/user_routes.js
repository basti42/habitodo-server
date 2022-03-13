const express = require("express");
const bcrypt = require("bcrypt");
const mongo = require("mongodb");

const generateAccessToken = require("../helpers/token");
const dbConnection = require("../database/connection");

const authenticateToken = require("../middlewares/auth");

const router = express.Router();

router.post("/register", (req, res) => {
    const { username, email, password } = req.body;

    const salt = bcrypt.genSaltSync( parseInt(process.env.SALT_ROUNDS) );
    const hash = bcrypt.hashSync(password, salt);

    const db = dbConnection.getDb();
    res.setHeader('Content-Type', 'application/json');
    
    // check that user with this email does not exist
    db.collection("app-users").findOne({email})
        .then( existing_user => {
            if (!existing_user){
                db.collection("app-users")
                .insertOne({username, 
                        email, 
                        password_hash: hash, 
                        email_validated: false,
                        registered_at: new Date(), 
                        icon_path: "",
                        position: "",
                        bio: "",
                        tokens: [],
                        team_ids: [],
                        boards: [],
                        personal_notes: []
                    })
                    .then( insert_result => {
                        const token = generateAccessToken(insert_result.insertedId.toString());
                        db.collection("app-users").findOneAndUpdate({email}, {$set: {"tokens": [token]}});
                        res.send(JSON.stringify({username, email, token, icon_path: ""}));
                    })
                    .catch( error => {
                        console.error(error);
                        res.status(403).send(JSON.stringify({message: "Unable to generate token from user_id"}));
                    });

            } else {
                res.status(401).send(JSON.stringify({message: "User with that email does already exist."}));
            }
        })
        .catch(error => {
            console.error(err);
            res.status(401).send(JSON.stringify({err}));
        });
});

router.post("/login", (req, res) => {
    const { email, password } = req.body;   
    const db = dbConnection.getDb(); 

    res.setHeader('Content-Type', 'application/json');
    
    db.collection("app-users").findOne({email})
        .then( existing_user => {
            if (bcrypt.compareSync(password, existing_user.password_hash)){
                const token = generateAccessToken(existing_user._id.toString());
                db.collection("app-users").updateOne({email}, {$push: {tokens: token}});
                res.send(JSON.stringify({ username: existing_user.username, email: existing_user.email, token, icon_path: existing_user.icon_path}));
            } else {
                res.status(401).send({message: "Incorrect password."});
            }
        })
        .catch( error => {
            res.status(401).send({message: `Error occured: ${error}`});
        })
});

router.post("/logout", authenticateToken, (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(" ")[1];
    res.setHeader('Content-Type', 'application/json');
    const db = dbConnection.getDb();
    db.collection("app-users").updateOne({_id: new mongo.ObjectId(req.decoded_token.user_id)}, { $pull: {tokens: token} })
        .then( update_result => {
            console.log("update result: ". update_result);
            res.send(JSON.stringify({message: "Successfully logged out"}));
        })
        .catch( error=> {
            res.status(401).send(JSON.stringify({message: "Unable to logout user"}));
        })
});

router.get("/me", authenticateToken, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const db = dbConnection.getDb();
    db.collection("app-users").findOne({_id: new mongo.ObjectId(req.decoded_token.user_id)})
        .then( user => {
            if (user){
                res.send({
                    username: user.username,
                    email: user.email,
                    icon_path: user.icon_path
                });    
            } else {
                res.status(401).send(JSON.stringify({message: "Something went horribly wrong"}));
            }
        })
        .catch( error => {
            res.status(401).send(JSON.stringify({message: `Error occured: ${error}`}));
        });
});

router.get("/profile", authenticateToken, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const db = dbConnection.getDb();
    db.collection("app-users").findOne({_id: new mongo.ObjectId(req.decoded_token.user_id)})
        .then( user => {
            if (user) {
                res.send({
                    registered_at: user.registered_at,
                    bio: user.bio || "",
                    position: user.position || "",
                    boards: user.boards || [],
                    personal_notes: user.personal_notes || [],
                    team_ids: user.team_ids || []
                });
            } else {
                res.status(401).send(JSON.stringify({message: "No user with this id is known."}));
            }
        })
        .catch( error => {
            res.status(401).send(JSON.stringify({message: `Error occured: ${error}`}));
        });
})

// TEST ROUTE FOR DB ACCESS
router.get("/all-users", (req, res) => {
    console.log("received get all users call");
    const db = dbConnection.getDb();
    db.collection("app-users")
        .find({})
        .limit(50)
        .toArray((err, result) => {
            if (err) {
                res.status(400).send(JSON.stringify({message: "Error fetching from users collection"}));
            } else {
                res.json(result);
            } 
        })
});

module.exports = router;