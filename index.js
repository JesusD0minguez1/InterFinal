const expressSession = require("express-session");
const pug = require("pug");
const {MongoClient, ObjectId} = require('mongodb');
const url = 'mongodb+srv://user:passw0rd123@interwebdev.82cunpv.mongodb.net/test'
const path = require('path');
const express = require("express");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
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
    resave: false //Changed from true to false keep in mind if it breaks
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


app.post("/postRegister", urlencodedParser, async (req, res) => {

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const confirm = req.body.confirmation;
    const age = req.body.age;
    const question1 = req.body.mult1;
    const question2 = req.body.mult2;
    const question3 = req.body.mult3;

    const emailRegex = /^[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]{4,}.[a-zA-Z]{2,}$/;
    const userRegex = /^[0-9a-zA-Z]+$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*[@$!%*?&])(?=.*\d)[A-Za-z\d@$!%*?&]{4,}$/; 
    
    if(username != null && password != null && email != null && age != null && confirm != null) {
        if(password == confirm) {
            if(userRegex.test(username) && emailRegex.test(email) && passwordRegex.test(password) && !isNaN(age)) {

                await client.connect();
                const encrypted = await encrypt(password);
                console.log('password: ', encrypted);
                let userInfo = {
                    "username" : username,
                    "password" : encrypted,
                    "email" : email,
                    "age" : age,
                    "question1" : question1,
                    "question2" : question2,
                    "question3" : question3
                }    
                await collection.insertOne(userInfo);
                client.close();
                res.redirect('/login')
            }
        }
    }
    else {
        //send them to an error page
    }
});

app.get('/edit/:id', checkAuth, async (req, res) => {

    await client.connect();
    console.log(req.session.user.id);

    const result = await collection.findOne({ _id: ObjectId(req.session.user.id.trim()) });
    client.close();

    console.log('data: ', result);

    res.render('edit', {
        question: result
    });
});

app.post('/edit/:id', urlencodedParser, async (req, res) => {
    await client.connect();
    await collection.updateOne({
        _id: ObjectId(req.session.user.id)},
        {$set: {
            question1: req.body.mult1,
            question2: req.body.mult2,
            question3: req.body.mult3
        }}
    );

    res.redirect('/edit/' + req.session.id);
});

app.get('/logout', (req, res) => {

    req.session.destroy(err => {
        if(err) {
            console.log(err);
        }
        else {
            res.redirect('/login');
        }
    });
});

app.listen(3000);