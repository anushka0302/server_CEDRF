const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT || 8000;
function generateOrderId() {
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(uniqueId).digest('hex');
  return hash.substring(0, 12);
}

app.get('/', (req, res) => {
  res.send('✅ Server running!');
});

// ✅ CREATE ORDER - POST
app.post('/payment', async (req, res) => {
  try {
    const orderId = generateOrderId();

    const {
      customer_name = 'Customer',
      customer_email = '',
      customer_phone = '9999999999'
    } = req.body;

    if (!customer_email) {
      return res.status(400).json({ error: 'customer_email required!' });
    }

    // ✅ Make safe customer_id for Cashfree
    const safeCustomerId = customer_email.replace(/[^a-zA-Z0-9_-]/g, '');

    const requestBody = {
      order_id: orderId,
      order_amount: 599.0,
      order_currency: 'INR',
      customer_details: {
        customer_id: safeCustomerId,
        customer_phone,
        customer_name,
        customer_email
      },
      
    };

    const response = await axios.post(BASE_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': CLIENT_ID,
        'x-client-secret': CLIENT_SECRET,
      },
    });

    console.log('✅ Created Order:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Server error', details: error.response?.data });
  }
});

// ✅ VERIFY ORDER - POST
app.post('/verify', async (req, res) => {
  const { orderId } = req.body;

  console.log("✅ Received orderId for verification:", orderId);

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId!' });
  }

  try {
    const response = await axios.get(`${BASE_URL}/${orderId}/payments`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': CLIENT_ID,
        'x-client-secret': CLIENT_SECRET,
      },
    });

    console.log("✅ Verify Response:", response.data);

    const payments = response.data;
    const successfulPayment = payments.find(
      (payment) => payment.payment_status === "SUCCESS"
    );

    if (successfulPayment) {
      return res.json({
        success: true,
        payment: successfulPayment,
       
      });
    } else {
      return res.status(400).json({ success: false, message: 'Payment not successful yet.' });
    }
  } catch (error) {
    console.error('❌ Verify Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Verify failed', details: error.response?.data });
  }
});


app.listen(PORT, () => console.log('✅ Server running on port 8000'));
