require("dotenv").config()

const crypto = require("crypto");


function cipher(clear_text){
    const cipher = crypto.createCipheriv(process.env.CRYPTO_ALGO, process.env.CRYPTO_KEY, Buffer.from(process.env.CRYPTO_IV));
    const encrypted_text  = cipher.update(clear_text, 'hex', 'hex') + cipher.final("hex");
    // console.log("Clear text: ", clear_text, " - Encrypted text: ", encrypted_text);
    return encrypted_text;
}

function decipher(encoded_text){
    const decipher = crypto.createDecipheriv(process.env.CRYPTO_ALGO, process.env.CRYPTO_KEY, Buffer.from(process.env.CRYPTO_IV));
    const decoded_text = decipher.update(encoded_text, 'hex', 'hex') + decipher.final("hex");
    // console.log("Encoded text: ", encoded_text, " - Decoded text: ", decoded_text);
    return decoded_text;
}


module.exports = { cipher , decipher};