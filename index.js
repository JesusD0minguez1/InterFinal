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


const encrypt = async str => {

    const salt = await bcrypt.genSalt(10);
    str = await bcrypt.hash(str, salt);
    return str;
}

const decrypt = (password, hash) => {

    return bcrypt.compareSync(password, hash);
}

const checkAuth =  (req, res, next) => {

    if(req.session.user && req.session.user.isAuthenticated) {
        next();
    }
    else {
        res.redirect('/');
    }
}

app.get('/', (req, res) => {

    res.render('index');
});

app.get("/login", (req, res) => {

    res.render('login');
});

app.post("/login", urlencodedParser, async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;
    
    await client.connect();

    const user = await collection.findOne({ "username" : username });
    
    if(decrypt(password, user.password) && username == user.username) {
        console.log('login successful');
        req.session.user = {

            isAuthenticated : true,
            id: user._id
        }
        //console.log('id:', req.session.user._id);
        
        res.redirect('/edit/' + user._id);
    }
    else {
        res.redirect('/login')
    }
});



app.get("/register", (req, res) => {

    res.render('register');
});

