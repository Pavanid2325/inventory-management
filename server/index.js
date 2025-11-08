require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios'); // Import axios

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const app = express();
app.use(cors());
app.use(express.json());

// This is your AI service's address
const AI_SERVICE_URL = 'http://localhost:5000/predict';

// Test endpoint
app.get('/', (req, res) => {
  res.send('Predictive Inventory API (with Supabase) is running!');
});

// === THE NEW FORECAST ENDPOINT ===
app.get('/api/forecast/:productId', async (req, res) => {
  try {
    // 1. Get the product ID from the URL
    const { productId } = req.params;

    // 2. --- SECURITY CHECK ---
    // Get the user's token from the request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    // The token is "Bearer YOUR_TOKEN". We just want the token.
    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase to get the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // --- SECURITY PASSED ---
    // We now know this is a valid, logged-in user.
    console.log(`Forecast request received for user: ${user.email} and product: ${productId}`);

    // 3. Call the Python AI Service (backend-to-backend)
    const aiResponse = await axios.post(AI_SERVICE_URL, {
      product_id: productId,
    });

    // 4. Send the forecast (from the AI) back to the client
    res.json(aiResponse.data);

  } catch (error) {
    // Handle errors from the AI service
    if (error.response && error.response.data) {
        console.error('Error from AI service:', error.response.data);
        // Pass the AI service's specific error message to the client
        return res.status(400).json(error.response.data);
    }
    
    console.error('Error in forecast endpoint:', error.message);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});