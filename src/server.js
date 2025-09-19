import express from "express";
import tripRoute from "./routes/tripsRouters.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5001

const app = express();

connectDB();

app.use(express.json);
app.use("/api/trips",tripRoute);

app.listen(PORT, ()=> {
    console.log(`Server start on port ${PORT}`);
});

