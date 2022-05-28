const express = require("express");
const router = express.Router();

const dbConnection = require("../database/connection");
const mongo = require("mongodb");

const authenticateToken = require("../middlewares/auth");
const { route } = require("express/lib/application");


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
        res.status(401).send(JSON.stringify({statusCode: 401, message: error}));
    }
});


router.get("/users/", authenticateToken, async(req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const {user, team} = req.body;

        const db = dbConnection.getDb();
        db.collection("app-scores")
            .find({ $or: [ {user: user}, {team: team} ] })
            // .limit(10)
            .toArray((err, result) => {
                if (err) {
                    res.status(400).send(JSON.stringify({message: "Error retrieving user scores"}));
                } else {
                    res.send(JSON.stringify(result));
                }
            })

    } catch (error){
        res.status(404).send(JSON.stringify({statusCode: 404, message: error}));
    }
});


router.put("/users/", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const {template, user, team, metrics} = req.body;
        const db = dbConnection.getDb();

        // check if at least user or team are set.
        if (template === null, user === null && team === null){
            res.status(404).send(JSON.stringify({statusCode: 404, message: "No owner for this score provided or no template id. unable to persist."}));
        }

        // check that metrics is an object and contains the correct properties
        if (typeof metrics !== "object" && !metrics.hasOwnProperty('metrics') && !metrics.length <= 0){
            res.status(404).send(JSON.stringify({statusCode: 404, message: `Expected type of 'metrics' to be 'object', received type '${typeof metrics}' instead.` }));
        }
        if (!metrics[0].hasOwnProperty('question') || !metrics[0].hasOwnProperty('value') || !metrics[0].hasOwnProperty('label')){
            res.status(404).send(JSON.stringify({statusCode: 404, message: "Expected 'metrics' to have properties: 'question', 'value', 'label'"}));
        }

        // TODO calc mean.
        let mean = 0.0;
        for (let metric of metrics){
            mean += metric.value;
        }
        mean /= metrics.length;

        const insert_result = await db.collection("app-scores").insertOne({
            date: new Date(),
            template,
            team,
            user,
            metrics,
            mean
        });

        res.send(JSON.stringify({statusCode: 200, message: "Added new template metric!"}));

    } catch (error){
        res.status(401).send(JSON.stringify({statusCode: 401, message: error}));
    }
});




module.exports = router;