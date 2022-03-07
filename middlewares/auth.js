require('dotenv').config();
const jwt = require("jsonwebtoken");
const dbConnection = require("../database/connection");


/***
 *  verifies that the token is valid, decodes the token and adds it to the req.decoded_token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader){
        const token = authHeader.split(" ")[1];
        if (token==null) return res.sendStatus(401);
        jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
            // if anything goes wrong with the token, most likely expiration
            // just delete this token from the user in the database and return 403
            if (err) {
                const db = dbConnection.getDb();
                db.collection("app-users").updateMany({tokens : {$exists:true}, $where:'this.tokens.length>0'}, {$pull : {tokens: token}})
                    .then( resultObject => { console.debug("[i] Updated tokens array after token verification failed: ", resultObject); })
                    .catch( err => { console.error(err); });
                return res.sendStatus(403); 
            }
            req.decoded_token = user;
            next();
        });
    } else {
        res.status(403).send(JSON.stringify({message: "No authorization header provided."}));
    }
}

module.exports = authenticateToken;