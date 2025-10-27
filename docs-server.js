import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// API documentation endpoint
app.get("/docs", (req, res) => {
    res.redirect('/api-docs.html');
});

app.listen(8080, () => {
    console.log('📚 API Documentation Server running on port 8080');
    console.log('📖 Visit: http://localhost:8080/docs');
});

