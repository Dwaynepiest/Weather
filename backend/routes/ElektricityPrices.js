const express = require('express');
const router = express.Router();
const axios = require('axios');
const apiKeyMiddleware = require('../middlewares/apiKeyMiddleware');

router.get('/', apiKeyMiddleware, async (req, res) => {
  const securityToken = process.env.SECURITY_TOKEN;
  const url = 'https://web-api.tp.entsoe.eu/api?documentType=A73&processType=A16&in_Domain=10YNL----------L&periodStart=202304280000&periodEnd=202304290000&securityToken='+ securityToken;

  try {
    const response = await axios.get(url, {
        headers: {
        'Content-Type': 'text/xml',
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).send('An error occurred while fetching electricity prices.');
  }
});


module.exports = router;
