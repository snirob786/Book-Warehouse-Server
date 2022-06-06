const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req,res,next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({
      message: 'Unathorized Access'
    })
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if (err) {
      return res.status(403).send({
        message: 'Forbidden Access'
      })
    }
    req.decoded = decoded;
    next();
  })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pxanj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const booksCollection = client.db('booksdb').collection('booklist');
        const blogsCollection = client.db('booksdb').collection('blogs');

        // Auth api
        app.post('/logintoken', async (req,res) =>{
          const user = req.body;
          const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
            expiresIn: '1d'
          });
          res.send({accessToken});
        })

        // Custom api
        app.get('/books', async (req, res) => {
            const query = {};
            const cursor = booksCollection.find(query);
            const books = await cursor.toArray();
            res.send(books);
        });

        app.get('/mybooks', verifyJWT, async (req, res) =>{
          const decodedUid = req.decoded.uid;
            const uid = req.query.uid;
            if (uid === decodedUid) {
                const query = { addedby: uid };
                const cursor = booksCollection.find(query);
                const books = await cursor.toArray();
                res.send(books);
            }
            else{
                res.status(403).send({message: 'forbidden access'})
            }

        });

        app.get('/blogs', async (req, res) => {
            const query = {};
            const cursor = blogsCollection.find(query);
            const blogs = await cursor.toArray();
            res.send(blogs);
        });

        app.get('/book/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const book = await booksCollection.findOne(query);
            res.send(book);
        });

        //Post Api
        app.post('/book', async (req, res) =>{
          const newBook = req.body;
          const result = await booksCollection.insertOne(newBook);
          res.send(result);
        })

        // Update or put api
        app.put('/book/:id', async (req, res ) =>{
          const id = req.params.id;
          const updateBook = req.body;
          const query = { _id: ObjectId(id) };
          const options = { upsert: true };
          const updatedDoc = {
            $set:{
              quantity: updateBook.quantity
            }
          }
          const result = await booksCollection.updateOne(query, updatedDoc, options);
          res.send(result)
        })

        // DELETE
        app.delete('/book/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await booksCollection.deleteOne(query);
            res.send(result);
        });

    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running Books Server');
});


app.listen(port, () => {
    console.log('Listening to port', port);
})
