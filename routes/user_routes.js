const express = require("express");
const bcrypt = require("bcrypt");
const mongo = require("mongodb");

const generateAccessToken = require("../helpers/token");
const dbConnection = require("../database/connection");
const simple_crypto = require("../helpers/simple_crypto");

const authenticateToken = require("../middlewares/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const salt = bcrypt.genSaltSync( parseInt(process.env.SALT_ROUNDS) );
        const hash = bcrypt.hashSync(password, salt);
    
        const db = dbConnection.getDb();
        res.setHeader('Content-Type', 'application/json');
        
        // check that user with this email does not exist
        let existing_user = await db.collection("app-users").findOne({email});
        let now = new Date();
        if (!existing_user){
            db.collection("app-users")
            .insertOne({username, 
                    user_id: "",
                    email, 
                    password_hash: hash, 
                    email_validated: false,
                    registered_at: now, 
                    icon_path: "/assets/user_avatars/blue_dog.png",
                    position: "",
                    bio: "",
                    tokens: [],
                    team_ids: [],
                    boards: [],
                    personal_notes: []
                })
                .then( insert_result => {
                    const token = generateAccessToken(insert_result.insertedId.toString());
                    const user_id = simple_crypto.cipher(insert_result.insertedId.toString());
                    db.collection("app-users").findOneAndUpdate({email}, {$set: {"tokens": [token], 
                                                                                                       "user_id": user_id}});
                    res.send(JSON.stringify(
                        {
                            username,
                            user_id, 
                            email, 
                            token, 
                            icon_path: "",
                            registered_at: now,
                            bio: "",
                            position: "",
                            boards: [],
                            personal_notes: [],
                            team_ids: []
                        }));
                })
                .catch( error => {
                    console.error(error);
                    res.status(403).send(JSON.stringify({message: "Unable to generate token from user_id"}));
                });

        } else {
            res.status(401).send(JSON.stringify({message: "User with that email does already exist."}));
        }
    } catch (error) {
        console.error(err);
        res.status(401).send(JSON.stringify({err}));
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;   
        const db = dbConnection.getDb(); 
    
        res.setHeader('Content-Type', 'application/json');
        
        let existing_user = await db.collection("app-users").findOne({email});
        if (bcrypt.compareSync(password, existing_user.password_hash)){
            const token = generateAccessToken(existing_user._id.toString());
            db.collection("app-users").updateOne({email}, {$push: {tokens: token}});
            res.send(JSON.stringify(
                {
                    username: existing_user.username, 
                    user_id: existing_user.user_id,
                    email: existing_user.email, 
                    token, 
                    icon_path: existing_user.icon_path,
                    registered_at: new Date(existing_user.registered_at).toLocaleString(),
                    bio: existing_user.bio || "",
                    position: existing_user.position || "",
                    boards: existing_user.boards || [],
                    personal_notes: existing_user.personal_notes || [],
                    team_ids: existing_user.team_ids || []
                }));
        } else {
            res.status(401).send({message: "Incorrect password."});
        }
    } catch (error) {
        res.status(401).send({message: `Error occured: ${error}`});
    }
});

router.post("/logout", authenticateToken, async (req, res) => {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader.split(" ")[1];
        res.setHeader('Content-Type', 'application/json');
        const db = dbConnection.getDb();
        
        let update_result = await db.collection("app-users").updateOne({_id: new mongo.ObjectId(req.decoded_token.user_id)}, { $pull: {tokens: token} });
        // console.log("update result: ", update_result);
        res.send(JSON.stringify({message: "Successfully logged out"}));
    } catch (error) {
        res.status(401).send(JSON.stringify({message: "Unable to logout user"}));
    }
});

router.get("/me", authenticateToken, async (req, res) => {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader.split(" ")[1];
        res.setHeader('Content-Type', 'application/json');
        const db = dbConnection.getDb();
        let user = await db.collection("app-users").findOne({_id: new mongo.ObjectId(req.decoded_token.user_id)});
        if (user){
            res.send({
                username: user.username,
                user_id: user.user_id,
                email: user.email,
                email_validated: user.email_validated,
                token,
                icon_path: user.icon_path,
                registered_at: new Date(user.registered_at).toLocaleString(),
                bio: user.bio || "",
                position: user.position || "",
                boards: user.boards || [],
                personal_notes: user.personal_notes || [],
                team_ids: user.team_ids || []
            });
        } else {
            res.status(401).send(JSON.stringify({message: "Something went horribly wrong"}));
        }
    } catch (error){
        res.status(401).send(JSON.stringify({message: `Error occured: ${error}`}));
    }
});

router.get("/profile", authenticateToken, async (req, res) => {
    try{
        res.setHeader('Content-Type', 'application/json');
        const db = dbConnection.getDb();
        let user = await db.collection("app-users").findOne({_id: new mongo.ObjectId(req.decoded_token.user_id)});
        if (user) {
            res.send({
                username: user.username,
                user_id: user.user_id,
                email: user.email,
                email_validated: user.email_validated,
                icon_path: user.icon_path,
                registered_at: new Date(user.registered_at).toLocaleString(),
                bio: user.bio || "",
                position: user.position || "",
                boards: user.boards || [],
                personal_notes: user.personal_notes || [],
                team_ids: user.team_ids || []
            });
        } else {
            res.status(401).send(JSON.stringify({message: "No user with this id is known."}));
        }
    } catch (error) {
        res.status(401).send(JSON.stringify({message: `Error occured: ${error}`}));
    }
})

router.post("/update_profile", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const { username, bio, position } = req.body;
        const db = dbConnection.getDb();
        let old_doc = await db.collection("app-users").findOneAndUpdate({
            _id: new mongo.ObjectId(req.decoded_token.user_id)},
            {$set: { username: username, bio: bio, position: position }});
        // console.log("old doc: ", old_doc)
        res.send(JSON.stringify({message: "update successful!"}));
    } catch (error){
        // console.error("updating profile: ", err);
        res.status(401).send(JSON.stringify({message: `Error occured ${err}`}));
    }
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
                res.json(JSON.stringify(result));
            } 
        })
});

module.exports = router;