const express = require("express");
const router = express.Router();

const dbConnection = require("../database/connection");
const mongo = require("mongodb");

const simple_crypto = require("../helpers/simple_crypto");
const authenticateToken = require("../middlewares/auth");

router.put("/add", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const { team_name, team_logo, members_emails } = req.body;
        const db = dbConnection.getDb();
    
        // at this point the user exists in the db and has a valid token
        const user = await db.collection("app-users").findOne({_id: new mongo.ObjectId(req.decoded_token.user_id)});

        // insert initial team values
        let response = await db.collection("app-teams").insertOne({
            team_name,
            team_id: "",
            team_logo,
            created_at: new Date(),
            members_emails,
            boards: [],
            team_admins: [ user.user_id ],  // cipher text of the internal mongodb object id for the user
            metrics: []
        });
        const cipherId = simple_crypto.cipher(response.insertedId.toString());
        
        // update public id = simple hex encoded cipher of mongo db _id
        let originalDoc = await db.collection("app-teams").findOneAndUpdate({_id: response.insertedId}, {$set: {team_id: cipherId} });

        // add this team id to the user who created it
        let orig_user_doc = await db.collection("app-users").findOneAndUpdate({_id: new mongo.ObjectId(req.decoded_token.user_id)}, {$push: {team_ids: cipherId}});
        res.send(JSON.stringify({message: "team added"}));

    } catch (error) {
        res.status(401).send(JSON.stringify({message: `Error: ${error}`}));
    }

});


router.delete("/delete/:team_id", authenticateToken, async (req, res) => {
    try{
        res.setHeader('Content-Type', 'application/json');
        const team_id = req.params.team_id;
        const db = dbConnection.getDb();

        // delte the actual team
        let deleteResponse = await db.collection("app-teams").deleteOne({team_id});
        // console.debug("Team deletion: ", deleteResponse);

        // remove the team_id from the users
        let usersUpdateResponse = await db.collection("app-users").updateMany({team_ids : {$exists:true}, $where:'this.team_ids.length>0'}, {$pull : {team_ids: team_id}});
        // console.debug("Users Update: ", usersUpdateResponse);

        res.send(JSON.stringify({message: "Removed Team"}));
    } catch (error) {

    }
})


router.get("/get/:team_id", authenticateToken, async (req, res) => {
    try{
        res.setHeader('Content-Type', 'application/json');
        const team_id = req.params.team_id;
        const db = dbConnection.getDb();
        const user_id = req.decoded_token.user_id; // string representation of the mongo object id for that user
        let actual_team_id = "";

        // if team id is empty, just retrive the first team for this user
        if (team_id === "0"){
            const user = await db.collection("app-users").findOne({"_id": new mongo.ObjectId(user_id)});
            if (user){
                actual_team_id = user.team_ids[-1];
            }
        } else {
            actual_team_id = team_id;
        }
        
        const team = await db.collection("app-teams").findOne({actual_team_id}); // find the team by the cipher text hashed id
        if (team === undefined){
            res.status(404).send(JSON.stringify({}));
        }
        delete team._id; // drop the internal mongoDB object id from the returned object, only use the cipher text id
        team.created_at = new Date(team.created_at).toLocaleString();
        res.send(JSON.stringify(team));

    } catch (error){
        res.status(404).send(JSON.stringify({message: `Error: ${error}`}));
    }
});

module.exports = router;