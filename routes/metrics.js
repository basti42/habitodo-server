const express = require("express");
const router = express.Router();

const dbConnection = require("../database/connection");
const mongo = require("mongodb");

const authenticateToken = require("../middlewares/auth");
const { route } = require("express/lib/application");


/*
    TEMPLATES
*/

const templateRetrival = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const team = req.params.team_id;
        const user_id = req.decoded_token.user_id;

        const db = dbConnection.getDb();
        db.collection("app-templates")
            .find({ $or: [ {owner: ""}, {owner: user_id}, {team: team} ] })
            .limit(25)
            .toArray((err, result) => {
                if (err) {
                    res.status(400).send(JSON.stringify({message: "Error retrieving metrics"}));
                } else {
                    result.forEach( res => { res.creation_date = new Date(res.creation_date).toLocaleString() } );
                    res.send(JSON.stringify(result));
                }
            })

    } catch (error){

    }
};


// get all templates that this user or team has access to
router.get("/templates/:team_id", authenticateToken, templateRetrival);
router.get("/templates/", authenticateToken, async (req, res) => {
    req.params.team_id = " ";
    templateRetrival(req, res);
});


router.put("/templates/", authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const { type, owner, team, title, description, metrics} = req.body;
        const db = dbConnection.getDb();

        // check if an owner is provided for this template.
        if (owner === null){
            return res.status(404).send(JSON.stringify({statusCode: 404, message: "No owner for this metrics template provided. unable to persist."}));
        }

        // check if type is the correct value
        const expectedTypes = ['feedbackscore']
        if (!expectedTypes.includes(type)){
            return res.status(404).send(JSON.stringify({statusCode: 404, message: `Unknown type specified for this metric. Allowed types: '${expectedTypes}'`}));
        }

        // check that metrics is an object and contains the correct properties
        if (typeof metrics !== "array" && metrics.length <= 0){
            return res.status(404).send(JSON.stringify({statusCode: 404, message: `Expected type of 'metrics' to be 'array', received type '${typeof metrics}' instead.` }));
        }
        if (!metrics[0].hasOwnProperty('question') || !metrics[0].hasOwnProperty('values') || !metrics[0].hasOwnProperty('label')){
            return res.status(404).send(JSON.stringify({statusCode: 404, message: "Expected 'metrics' to have properties: 'question', 'values', 'label'"}));
        }

        const insert_result = await db.collection("app-templates").insertOne({
            type,
            creator: req.decoded_token.user_id,
            creation_date: new Date(),
            owner,
            team, 
            title, 
            description, 
            metrics
        });

        return res.send(JSON.stringify({statusCode: 200, message: "Added new template metric!"}));

    } catch (error){
        return res.status(401).send(JSON.stringify({statusCode: 401, message: error}));
    }
});


// retrieves all scores for the user AND the given team
router.get("/users/", authenticateToken, async(req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const {user, team} = req.body;

        const db = dbConnection.getDb();
        db.collection("app-scores")
            .find({ $and: [ {user: user}, {team: team} ] })
            // .limit(10)
            .toArray((err, result) => {
                if (err) {
                    res.status(400).send(JSON.stringify({message: "Error retrieving user scores"}));
                } else {
                    // sort in ascending order by date
                    result.sort((left, right) => { (left.date > right.date) ? 1 : ((left.date < right.date) ? -1 : 0) });
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

        // calc mean.
        let mean = 0.0;
        metrics.forEach( metric => { mean += metric.value; } );
        mean /= metrics.length;

        const insert_result = await db.collection("app-scores").insertOne({
            date: new Date(),
            template,
            team,
            user,
            metrics,
            mean
        });

        res.send(JSON.stringify({statusCode: 200, message: "Added new user score!"}));

    } catch (error){
        res.status(401).send(JSON.stringify({statusCode: 401, message: error}));
    }
});



router.get("/teams/:teamid", authenticateToken, async(req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        const teamid = req.params.teamid;

        const db = dbConnection.getDb();
        db.collection("app-scores")
            .find({ $in: [ {team: teamid} ] })
            .toArray((err, result) => {
                if (err) {
                    res.status(400).send(JSON.stringify({message: "Error retrieving team scores"}));
                } else {
                    // sort in ascending order by date
                    result.sort((left, right) => { (left.date >= right.date) ? 1 : ((left.date < right.date) ? -1 : 0) });
                    // create return object
                    res.send(JSON.stringify(result));
                }
            })
    } catch (error) {
        res.status(404).send(JSON.stringify({statusCode: 404, message: error}));
    }

});



module.exports = router;