const express = require("express");
const router = express.Router();

const dbConnection = require("../database/connection");
const mongo = require("mongodb");

const simple_crypto = require("../helpers/simple_crypto");
const authenticateToken = require("../middlewares/auth");

// add a new team
router.put("/", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const { team_name, team_logo, emails } = req.body;
        const db = dbConnection.getDb();

        // insert initial team values
        let response = await db.collection("app-teams").insertOne({
            team_name,
            team_id: "",
            team_logo,
            created_at: new Date(),
            emails: emails,
            boards: [],
            members: [ req.decoded_token.user_id ],
            admins: [ req.decoded_token.user_id ]
        });
        const cipherId = simple_crypto.cipher(response.insertedId.toString());
        
        // update public id = simple hex encoded cipher of mongo db _id
        let new_document = await db.collection("app-teams").findOneAndUpdate(
            {_id: new mongo.ObjectId(response.insertedId.toString())}, 
            {$set: {team_id: cipherId}},
            { returnDocument: "after"});
        delete new_document.value._id
        new_document.value.created_at = new Date(new_document.value.created_at).toLocaleString();
        return res.send(JSON.stringify(new_document.value));

    } catch (error) {
        return res.status(401).send(JSON.stringify({statusCode: 401, message: `Error: ${error}`}));
    }

});

// get all teams for the logged in user
router.get("/", authenticateToken, async (req, res) => {
    try{
        res.setHeader('Content-Type', 'application/json');
        const db = dbConnection.getDb();
        const user_id = req.decoded_token.user_id; // string representation of the mongo object id for that user
        
        const teams = await db.collection("app-teams").find({ members: { $all: [user_id] } }).toArray();
        // remove the actual mongo object _id from the team object, its not needed and format the date string
        teams.forEach( team => { delete team._id; team.created_at = new Date(team.created_at).toLocaleString(); } );

        return res.send(JSON.stringify(teams));

    } catch (error){
        return res.status(404).send(JSON.stringify({message: `Error: ${error}`}));
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

// get team by team_id, only if logged in user is part of this team
router.get("/:team_id", authenticateToken, async (req, res) => {
    try{
        res.setHeader('Content-Type', 'application/json');
        const team_id = req.params.team_id;
        const db = dbConnection.getDb();
        const user_id = req.decoded_token.user_id; // string representation of the mongo object id for that user
        
        const team = await db.collection("app-teams").findOne({team_id: team_id, members: {$all: [user_id]}}); // find the team by the cipher text hashed id
        if (team === null || team === undefined){
            return res.status(404).send(JSON.stringify({statusCode: 404, message: `Unable to find team by team_id='${team_id}'. Team may not exist or user is not a member of that team.`}));
        }
        delete team._id; // drop the internal mongoDB object id from the returned object, only use the cipher text id
        team.created_at = new Date(team.created_at).toLocaleString();  // convert date to readable string
        return res.send(JSON.stringify(team));

    } catch (error){
        res.status(404).send(JSON.stringify({message: `Error: ${error}`}));
    }
});


// update the team if the user is logged in and an admin for that team
// update will OVERRIDE the provided values! So only append or remove from lists that were sent from get routes.
router.post("/:team_id", authenticateToken, async (req, res) => {
    try{
        res.setHeader('Content-Type', 'application/json');
        const team_id = req.params.team_id;
        const { team_name, team_logo, emails, boards, members, admins } = req.body;
        const db = dbConnection.getDb();
        const user_id = req.decoded_token.user_id; // string representation of the mongo object id for that user
        
        const updated_team = await db.collection("app-teams").findOneAndUpdate(
            { team_id: team_id, admins: {$all: [user_id]} },
            { $set: { team_name, team_logo, members_emails: emails, boards, members, admins } },
            { returnDocument: "after" });
        
        if (updated_team.ok !== 1){
            return res.status(404).send(JSON.stringify({statusCode: 404, message: "Unable to find team by team_id. Team may not exist or user is not a member of that team."}));
        }
        delete updated_team.value._id; // drop the internal mongoDB object id from the returned object, only use the cipher text id
        updated_team.value.created_at = new Date(updated_team.value.created_at).toLocaleString();  // convert date to readable string
        return res.send(JSON.stringify(updated_team.value));

    } catch (error){
        res.status(404).send(JSON.stringify({message: `Error: ${error}`}));
    }
});

module.exports = router;