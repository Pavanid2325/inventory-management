require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const AI_SERVICE_URL = 'http://localhost:5000/predict';

// === HELPER FUNCTION TO GET USER FROM TOKEN ===
const getUserFromToken = async (authHeader) => {
  if (!authHeader) {
    throw new Error('No authorization token provided');
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }
  return user;
};

// === FORECAST ENDPOINT (Existing - No Changes) ===
app.get('/api/forecast/:productId', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    const { productId } = req.params;
    
    console.log(`Forecast request for user: ${user.email}, product: ${productId}`);

    const aiResponse = await axios.post(AI_SERVICE_URL, {
      product_id: productId,
    });

    res.json(aiResponse.data);
  } catch (error) {
    if (error.response && error.response.data) {
      return res.status(400).json(error.response.data);
    }
    console.error('Error in forecast endpoint:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// === UPDATED FEATURE: BULK SALES UPLOAD (WITH AUTO-CREATE) ===
app.post('/api/sales/bulk-upload', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    const salesData = req.body.sales;

    if (!salesData || !Array.isArray(salesData)) {
      return res.status(400).json({ error: 'Invalid sales data format.' });
    }
    console.log(`Receiving ${salesData.length} sales records for user ${user.email}`);

    // 2. Get all of the user's products
    let { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('product_id, name')
      .eq('user_id', user.id);

    if (productError) throw productError;

    const productMap = new Map();
    products.forEach(p => {
      productMap.set(p.name.toLowerCase(), p.product_id);
    });

    // 3. First Pass: Identify new products
    const newProductNames = new Set();
    const salesToProcess = [];
    const failedRows = [];

    for (const sale of salesData) {
      const productName = sale.product_name ? String(sale.product_name).trim() : null;
      const productNameLower = productName ? productName.toLowerCase() : null;

      if (!productNameLower || !sale.sale_date || !sale.quantity) {
        failedRows.push({ ...sale, reason: "Missing required fields" });
        continue;
      }
      
      if (!productMap.has(productNameLower)) {
        newProductNames.add(productName);
      }
      salesToProcess.push(sale);
    }

    // 4. Batch Create New Products (if any)
    if (newProductNames.size > 0) {
      const productsToInsert = Array.from(newProductNames).map(name => ({
        name: name,
        user_id: user.id,
      }));

      console.log(`Creating ${productsToInsert.length} new products...`);

      // --- THIS IS THE FIX ---
      // We run .insert() and check for an error. We DO NOT chain .select()
      const { error: insertProductError } = await supabaseAdmin
        .from('products')
        .insert(productsToInsert);

      if (insertProductError) throw insertProductError;

      // 5. RE-FETCH all products to get the new IDs
      let { data: updatedProducts, error: refetchError } = await supabaseAdmin
        .from('products')
        .select('product_id, name')
        .eq('user_id', user.id);
      
      if (refetchError) throw refetchError;

      // Re-build the map with the new products
      productMap.clear();
      updatedProducts.forEach(p => {
        productMap.set(p.name.toLowerCase(), p.product_id);
      });
    }

    // 6. Second Pass: Process and insert all sales
    const salesToInsert = [];
    for (const sale of salesToProcess) {
      const productNameLower = sale.product_name.trim().toLowerCase();
      const productId = productMap.get(productNameLower);

      if (productId) {
        salesToInsert.push({
          product_id: productId,
          user_id: user.id,
          sale_date: sale.sale_date,
          quantity: parseInt(sale.quantity, 10)
        });
      } else {
        failedRows.push({ ...sale, reason: "Failed to find product ID after creation" });
      }
    }

    // 7. Bulk insert the valid sales
    if (salesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('sales')
        .insert(salesToInsert);
      
      if (insertError) throw insertError;
    }

    res.json({
      message: `Successfully inserted ${salesToInsert.length} sales. ${newProductNames.size} new products created.`,
      failed_rows: failedRows.length,
      failures: failedRows
    });

  } catch (error) {
    console.error('Error in bulk upload:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});