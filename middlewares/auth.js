require('dotenv').config();
const jwt = require("jsonwebtoken");
const dbConnection = require("../database/connection");


/***
 *  verifies that the token is valid, decodes the token and adds it to the req.decoded_token
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader){
        const token = authHeader.split(" ")[1];
        if (token==null) return res.sendStatus(401);
        jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
            // if anything goes wrong with the token, most likely expiration just return 403
            if (err) {
                return res.status(403).send(JSON.stringify({statusCode: 403, message: err})); 
            }
            req.decoded_token = user;
            next();
        });
    } else {
        res.status(404).send(JSON.stringify({statusCode: 403, message: "No authorization header provided."}));
    }
}

module.exports = authenticateToken;