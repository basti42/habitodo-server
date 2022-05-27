const express = require("express");
const router = express.Router();

const dbConnection = require("../database/connection");
const mongo = require("mongodb");

const authenticateToken = require("../middlewares/auth");


router.get("/", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const {user, team} = req.body;

        const db = dbConnection.getDb();
        db.collection("app-templates")
            .find({ $or: [ {user: user}, {team: team} ] })
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


router.put("/", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const {user, team, title, description, metrics} = req.body;
        const db = dbConnection.getDb();

        // check if at least user or team are set.
        if (user === null && team === null){
            res.status(404).send(JSON.stringify({statusCode: 404, message: "No owner for this metrics template provided. unable to persist."}));
        }

        // check that metrics is an object and contains the correct properties
        if (typeof metrics !== "array" && metrics.length <= 0){
            res.status(404).send(JSON.stringify({statusCode: 404, message: `Expected type of 'metrics' to be 'array', received type '${typeof metrics}' instead.` }));
        }
        if (!metrics[0].hasOwnProperty('question') || !metrics[0].hasOwnProperty('values') || !metrics[0].hasOwnProperty('label')){
            res.status(404).send(JSON.stringify({statusCode: 404, message: "Expected 'metrics' to have properties: 'question', 'values', 'label'"}));
        }

        const insert_result = await db.collection("app-templates").insertOne({
            user,
            team, 
            title, 
            description, 
            metrics
        });

        res.send(JSON.stringify({statusCode: 200, message: "Added new template metric!"}));

    } catch (error){

    }
});



module.exports = router;