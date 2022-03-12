const md5 = require("md5");

// https://de.gravatar.com/site/implement/images/  <-- addition params for random icon generation

function generateGravatarFromEmail(email, size = 150) {
    let lowerCaseEmail = email.toLowerCase();
    let emailHash = md5(lowerCaseEmail);
    return `http://www.gravatar.com/avatar/${emailHash}?d=identicon&s=${size}`
}

module.exports = generateGravatarFromEmail;