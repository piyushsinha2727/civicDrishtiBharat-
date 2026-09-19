import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MongoDB URI missing! Check MONGO_URI or MONGODB_URI in your .env file.");
        }
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
        throw error;
    }
};

export default connectDB;
