require('dotenv').config();
const jwt = require("jsonwebtoken");

function generateAccessToken(user_id){
    return jwt.sign({user_id}, process.env.TOKEN_SECRET, {expiresIn: "7d"});
}

module.exports = generateAccessToken;