const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middlewire
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Running");
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bgl6y.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJwt = (req, res, next) => {
  console.log("Verifying");
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.send({ error: true, message: "Unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collections
    const serviceCollection = client.db("geniusCar").collection("services");
    const orderCollection = client.db("geniusCar").collection("orders");
    const productsCollection = client.db("geniusCar").collection("products");
    const teamCollection = client.db("geniusCar").collection("team");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });
    // Services
    app.get("/ourservices", async (req, res) => {
      const query = {};

      const cursor = serviceCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services", async (req, res) => {
      const sort = req.query.sort;
      console.log(sort);
      const search = req.query.search;

      const query = { title: { $regex: ".*" + search + ".*", $options: "i" } };
      const options = {
        // sort matched documents in descending order by rating
        sort: {
          price: sort === "acendingOrder" ? 1 : -1,
        },
      };
      const cursor = serviceCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    // products
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //team
    app.get("/team", async (req, res) => {
      const query = {};
      const cursor = teamCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Orders
    app.get("/orders", verifyJwt, async (req, res) => {
      const decoded = req.decoded;

      if (decoded.email !== req.query.email) {
        return res.send({ error: true, message: "Forbidden Access" });
      }

      let query = {};
      if (req.query.email) {
        query = { email: req.query?.email };
      }
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      const updateDoc = {
        $set: {
          status: updatedBooking.status,
        },
      };
      const result = await orderCollection.updateOne(query, updateDoc);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
