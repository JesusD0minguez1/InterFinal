const expressSession = require("express-session");
const pug = require("pug");
const {MongoClient, ObjectId} = require('mongodb');
const url = 'mongodb+srv://user_1:Passw0rd1@cluster0.lolsc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'
const path = require('path');
const express = require("express");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const app = express();

const client = new MongoClient(url);
const db = client.db('users');
const collection = db.collection('information');

app.set('view engine', 'pug');
app.set('views', __dirname + "/views");

app.use(express.static(path.join(__dirname,'/public')));
app.use(cookieParser());
app.use(expressSession({

    secret: 'wh4t3v3r',
    saveUninitialized:true,
    resave: true
}));

const urlencodedParser = express.urlencoded({
    extended: false
});


