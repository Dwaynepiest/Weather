const express = require('express');
const cors = require('cors');
const db = require('./db'); // Import the database connection
const port = 3001;
const http = require('http');
require('dotenv').config();
const apiKeyMiddleware = require('./middlewares/apiKeyMiddleware');
const corsOptions = require('./config/corsOptions');
const userRoutes = require('./routes/userRoutes');
const electricityPricesRoutes = require('./routes/ElektricityPrices');


// Create an Express app
const app = express();

app.use(express.json()); // To parse JSON bodies
app.use(cors(corsOptions));

// Use routes
app.use('/users', userRoutes);
app.use('/elektricity', electricityPricesRoutes);
 


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

