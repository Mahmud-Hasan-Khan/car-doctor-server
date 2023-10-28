const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware 
// send token to client side
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bjwj9uc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// My created middleware
const logger = async (req, res, next) => {
    console.log('called:', req.host, req.originalUrl)
    next();
}

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;

    console.log('value of token in middleware', token);

    if (!token) {
        return res.status(401).send({ message: 'not authorized' })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        // error
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        // if token is valid then it would be decoded
        console.log('value in the token', decoded);
        req.user = decoded;
        next();
    })
}

async function run() {
    try {
        const serviceCollection = client.db('carDoctor').collection('services');

        const bookingCollection = client.db('carDoctor').collection('bookings');


        // auth related api
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log(user);
            // create token
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '12h' })

            // set to cookie
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false
                })
                .send({ success: true });
        })


        app.get('/services', logger, async (req, res) => {
            const cursor = serviceCollection.find({});
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = {
                // Include only the `title` and `imdb` fields in each returned document
                projection: { _id: 1, title: 1, price: 1, service_id: 1, img: 1 },
            };

            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })

        // get booking filtering by email
        // app.get('/bookings', logger, verifyToken, async (req, res) => {
        //     // console.log('received token', req.cookies.token);
        //     console.log('user in the valid token', req.user);

        //     if (req.query.email !== req.user.email) {
        //         return res.status(403).send({ message: 'forbidden access' })
        //     }

        //     const { email } = req.query;
        //     const query = { email };
        //     const result = await bookingCollection.find(query).toArray();
        //     res.send(result);
        // });

        app.get('/bookings', logger, verifyToken, async (req, res) => {
            console.log(req.query.email);
            // console.log('ttttt token', req.cookies.token)
            console.log('user in the valid token', req.user)

            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        // app.get('/bookings/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const result = await bookingCollection.findOne(query);
        //     res.send(result);
        // });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })


        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateBooking = req.body;
            console.log(updateBooking);
            const updateDoc = {
                $set: {
                    status: updateBooking.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })






        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('car doctor server is running')
})

app.listen(port, () => {
    console.log(`Car doctor server is running on port ${port}`);
})


