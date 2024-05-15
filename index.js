const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const port = process.env.PORT || 5000;
require("dotenv").config();


//Middleware
app.use(cors(
    {
        origin: [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5000',
            'https://job-portal-abrar.netlify.app'

        ],
        credentials: true
    }
));
app.use(express.json());
app.use(cookieParser());




//Custom Middlware 
const logger = (req, res, next) => {
    console.log("log: info", req.method, req.url);
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    console.log("token in the middleware: ", token);

    if (!token) {
        return res.status(401).send({ message: "Unauthorized Access" });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized access" })
        }
        req.user = decoded;
        next();
    })
}



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
        const appliedJobsCollection = client.db('jobPortalDB').collection('appliedJobs')

        //Auth Releted API
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log("user for token", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '5hr'
            })

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
            res.send({ success: true });
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true });
        })


        // app.post('/logout', async (req, res) => {
        //     const user = req.body;
        //     console.log("logging out", user);
        //     res.clearCookie('token', { maxAge: 0 }.send({ success: true }))
        // })


        //Jobs Api
        app.get('/jobs', logger, async (req, res) => {
            const cursor = jobsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        //find job by id
        app.get('/job/:id', logger, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(query);
            res.send(result);
        })

        //Post a job
        app.post('/jobs', logger, async (req, res) => {
            const newJob = req.body;
            console.log(newJob);
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        })


        //Update job
        app.put('/job/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedJob = req.body;
            const job = {
                $set: {
                    job_banner: updatedJob.job_banner,
                    job_title: updatedJob.job_title,
                    job_category: updatedJob.job_category,
                    job_description: updatedJob.job_description,
                    job_responsibilities: updatedJob.job_responsibilities,
                    why_work_with_us: updatedJob.job_responsibilities,
                    application_deadline: updatedJob.application_deadline,
                    posting_date: updatedJob.posting_date,
                    salary_range: updatedJob.salary_range
                }
            }
            const result = await jobsCollection.updateOne(filter, job, options);
            console.log(updatedJob)
            res.send(result);
        })


        //Delete a job
        app.delete("/job/:id", logger, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.deleteOne(query);
            res.send(result);
        })



        //Pagination releted api
        app.get('/pagedJobs', logger, async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            console.log("Pagination query", req.query);
            const result = await jobsCollection.find()
                .skip(page * size) //skip means data to be skiped till the res
                .limit(size) // limit is use for to show qty of size
                .toArray();
            res.send(result);
        })


        //getting total job count
        app.get('/jobCount', async (req, res) => {
            const count = await jobsCollection.estimatedDocumentCount();
            res.send({ count });
        })




        //Apply job releted api's 
        // Convert applicant_number field to string to number
        async function convertApplicantNumberToNumber() {
            const cursor = jobsCollection.find({ applicants_number: { $type: 'string' } });
            const jobsToUpdate = await cursor.toArray();
            const updatePromise = jobsToUpdate.map(async (job) => {
                const jobId = job._id;
                const numericApplicantsNumber = parseInt(job.applicants_number);
                if (!isNaN(numericApplicantsNumber)) {
                    await jobsCollection.updateOne(
                        { _id: jobId },
                        { $set: { applicants_number: numericApplicantsNumber } }
                    );
                }
            });
            await Promise.all(updatePromise);
            console.log("conversion seccessfull!");
        }


        //get applied job Api
        app.get('/appliedJobs', logger, async (req, res) => {
            console.log(req.query.email) //Consoling users emails on server terminal
            // console.log("from in the valid token", req.user)
            console.log(req.cookies)
            if (req.query?.email !== req.user?.email) {
                return res.status(403).send({ message: "Forbidden Access" })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email };
            }
            console.log(query)

            const cursor = appliedJobsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })



        //APPLY A JOB  // trying $inc to update Applicant_number field
        app.post('/applyJob', async (req, res) => {
            const applyJob = req.body;

            const jobId = applyJob.jobId;
            await convertApplicantNumberToNumber();
            const reslt = await jobsCollection.updateOne(
                { _id: new ObjectId(jobId) },
                { $inc: { applicants_number: 1 } }
            );
            if (reslt.modifiedCount === 1) {
                console.log("Update operation success")
            } else {
                console.log("Update operation failed")
            }

            console.log("Showing Received data from /applyJob Route:", applyJob);
            const result = await appliedJobsCollection.insertOne(applyJob);
            res.send(result);
        })


        //APPLY A JOB // WITHOUT updating applicant_number field
        // app.post('/applyJob', async (req, res) => {
        //     const applyJob = req.body;
        //     console.log("Showing Received data from /applyJob Route:", applyJob);
        //     const result = await appliedJobsCollection.insertOne(applyJob);
        //     res.send(result);
        // })


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

