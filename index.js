const express = require('express');
const cors = require('cors');
const app = express();
// const jwt = require('jsonwebtoken');


const port = process.env.PORT || 5000;
require("dotenv").config();


//Middleware
app.use(cors(
    {
        origin: ['http://localhost:5174/'],
        credentials: true
    }
))
app.use(express.json());
// app.use(cookieParser());


app.get('/', (req, res) => {
    res.send("Job Portal Server is Running");
})


app.listen(port, () => {
    console.log(`Job Portal server is Running on PORT : ${port}`);
})

