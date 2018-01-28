const express = require('express');

const app = express();

// Add join data format for posting
app.use(express.json());


app.listen(process.env.PORT || 8080);
