import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);

        console.log("Connect to DB successfully");
    } catch (error) {
        console.error("Cannot connect to DB", error);
        process.exit(1);
    }
};