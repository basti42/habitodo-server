require('dotenv').config();
const jwt = require("jsonwebtoken");


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader){
        const token = authHeader.split(" ")[1];
        if (token==null) return res.sendStatus(401);
        jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.decoded_token = user;
            next();
        });
    } else {
        res.status(403).send(JSON.stringify({message: "No authorization header provided."}));
    }
}

module.exports = authenticateToken;