require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const compression = require("compression");
const db = require("./database/connection");

const statusRoutes = require("./routes/status_routes");
const userRoutes = require("./routes/user_routes");
const boardRoutes = require("./routes/board_routes");

const app = express();

// use third-party middlewares
app.use(compression());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());

// // global error handling
// app.use(function(err, _req, res){
//     console.error(err.stack);
//     res.status(500).send(JSON.stringify({message: "unexpected server-side error"}));
// })

// initialize db connection
db.connectToServer((err) => {
    if (err){
        console.error(err);
        process.exit();
    }
});

// apply the routes
app.use("/status", statusRoutes);
app.use("/app/user", userRoutes);
app.use("/app/boards", boardRoutes);


// make the app listen on a specified port
app.listen(process.env.PORT, process.env.HOST, 
    () => console.log(`App running in mode='${process.env.NODE_ENV}' on ${process.env.HOST}:${process.env.PORT}`));