const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
dotenv.config()

const app = express();
app.use(bodyParser.urlencoded({ extended:true}));
app.use(bodyParser.json());
app.use(cors())

app.get('/',(req,res)=>{
    res.json({
        status: "sucess",
        message : "all good"
    })
})

app.listen(process.env.PORT,()=>{
    mongoose.connect(process.env.MONGODB_URL,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
        console.log(`server running on http://localhost:${process.env.PORT}`)
    }).catch((error)=>console.log(error))
})