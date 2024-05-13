const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const port = process.env.PORT || 5000;
require("dotenv").config();


//Middleware
app.use(cors(
    // {
    //     origin: ['http://localhost:5174/'],
    //     credentials: true
    // }
))
app.use(express.json());
app.use(cookieParser());

//Custom Middlware 




//Mongo Reletaed API Started
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1qcsvas.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        //Collection name from MongoDB
        const jobsCollection = client.db('jobPortalDB').collection('jobs')
        // const appliedJobsCollection = client.db('jobPortalDB').collection('appliedJobs')


        //Jobs Api
        app.get('/jobs', async (req, res) => {
            const cursor = jobsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        //find job by id
        app.get('/job/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(query);
            res.send(result);
        })

        //Post a job
        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            console.log(newJob);
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        })



    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

//Mongo Reletaed API Ended



app.get('/', (req, res) => {
    res.send("Job Portal Server is Running");
})


app.listen(port, () => {
    console.log(`Job Portal server is Running on PORT : ${port}`);
})

