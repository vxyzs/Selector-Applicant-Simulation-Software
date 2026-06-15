import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

console.log('MongoDB URI:', uri); // Log the MongoDB URI for debugging
if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise || global._mongoClientUri !== uri) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
        global._mongoClientUri = uri;
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export async function connectToDatabase() {
    const client = await clientPromise;
    const db = client.db();
    return { client, db };
}
