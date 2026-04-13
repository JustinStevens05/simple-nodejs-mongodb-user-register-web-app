// imports 
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5500;

// db connection
mongoose.connect(process.env.DB_URL,{
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', (error)=> console.log(error));
db.once('open', ()=>console.log('Db Connection established successfully'));

// middleware
app.use(express.urlencoded({extended:false}));
app.use(express.json());

app.use(session({secret: 'my secreat key',saveUninitialized:true,resave: false}));
app.use(express.static('uploads'));
app.use((req, res, next)=>{
    res.locals.message = req.session.message; 
    delete req.session.message;
    next();
});

// set templete engine
app.set('view engine', 'ejs');


// route prefix
app.use("", require('./routes/routes'))

app.listen(PORT, ()=>{console.log(`Server Started. Url: http://localhost:${PORT}`);});