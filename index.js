const expressSession = require("express-session");
const pug = require("pug");
const axios = require('axios');
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

//Middleware function to check session
const checkAuth =  (req, res, next) => {

    if(req.session.user && req.session.user.isAuthenticated) {
        next();
    }
    else {
        res.redirect('/');
    }
}

app.get('/', async (req, res) => {
    var json_code = { 'hello': 'world' };

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    await axios.get('http://localhost:3000/api').then(res => {
        const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
        console.log('Status Code:', res.status);
        console.log('Date in Response header:', headerDate);
        
        json_code = res.data;
    }).catch(err => {
        console.log('Error: ', err.message);
    });
    
    if(req.cookies.beenHereBefore == "yes"){
        json_code = {...json_code, "lastvisit": "You were last here on: " + req.cookies.beenHereDate}
        var date = new Date();
        var month = months[date.getMonth()];
        var day = date.getDate();
        var year = date.getFullYear();

        date = month + ", " + day + ", " + year;

        console.log(date);
        res.cookie("beenHereDate", date, {maxAge: 999999999999});
    }else{
        json_code = {...json_code, "lastvisit": "Looks like it's your first time here!"}
        
        res.cookie("beenHereBefore", "yes", {maxAge: 999999999999});
        var date = new Date();
        var month = months[date.getMonth()];
        var day = date.getDate();
        var year = date.getFullYear();

        date = month + ", " + day + ", " + year;

        console.log(date);
        res.cookie("beenHereDate", date, {maxAge: 999999999999});
    }

    console.log(json_code);
    
    res.render('index', { title: 'Express', data: JSON.stringify(json_code)}); 
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
            }else{
                res.redirect("register")
            }
        }else{
            res.redirect("register")
        }
    }else{
        res.redirect("register")
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

app.get("/api", async (req, res) => {
    await client.connect();

    var users = await collection.find().toArray();

    var question1_1st = 0;
    var question1_2nd = 0;
    var question1_3rd = 0;
    var question1_4th = 0;

    var question2_1st = 0;
    var question2_2nd = 0;
    var question2_3rd = 0;
    var question2_4th = 0;

    var question3_1st = 0;
    var question3_2nd = 0;
    var question3_3rd = 0;
    var question3_4th = 0;

    for(u in users){
        switch(users[u].question1){
            case "Dragon":
                question1_1st++;
                break;
            case "Rabbit":
                question1_2nd++;
                break;
            case "Dog":
                question1_3rd++;
                break;
            case "Bull":
                question1_4th++;
                break;
        }

        switch(users[u].question2){
            case "1":
                question2_1st++;
                break;
            case "2":
                question2_2nd++;
                break;
            case "3":
                question2_3rd++;
                break;
            case "4":
                question2_4th++;
                break;
        }

        switch(users[u].question3){
            case "Green, Purple, Orange":
                question3_1st++;
                break;
            case "Red, Purple, Blue":
                question3_2nd++;
                break;
            case "Blue, Red, Green":
                question3_3rd++;
                break;
            case "Pink, Blue, Green":
                question3_4th++;
                break;
        }
    }

    json = {
        question1: {
            title: "What animal does not appear on the Chinese Zodiac?",
            firstresp: "Dragon: " + question1_1st,
            secondresp: "Rabbit: " + question1_2nd,
            thirdresp: "Dog: " + question1_3rd,
            fourthresp: "Bull: " + question1_4th
        },

        question2: {
            title: "How many hearts does an octopus have?",
            firstresp: "One: " + question2_1st,
            secondresp: "Two: " + question2_2nd,
            thirdresp: "Three: " + question2_3rd,
            fourthresp: "Four: " + question2_4th
        },

        question3: {
            title: "What are the 3 distinct colors of the powerpuff girls?",
            firstresp: "Green, purple, and orange: " + question3_1st,
            secondresp: "Red, purple, and blue: " + question3_2nd,
            thirdresp: "Blue, red, and green: " + question3_3rd,
            fourthresp: "Pink, blue, and green: " + question3_4th
        },

        total: users.length
    }

    res.json(json);
});

app.listen(3000);