const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from crm-service package root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Segment = require('../models/Segment');
const Campaign = require('../models/Campaign');
const Communication = require('../models/Communication');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI is not defined in the environment.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected successfully!');

  try {
    // 1. Verify Customer Validation & Insertion
    console.log('\n--- Verifying Customer Model ---');
    
    // Test validation failure for invalid phone
    try {
      const invalidCustomer = new Customer({
        name: 'Invalid Phone User',
        email: 'invalid@test.com',
        phone: '1234567890', // should fail (needs +91 and 10 digits)
        channel_preference: 'sms'
      });
      await invalidCustomer.validate();
      console.error('❌ Expected validation to fail for invalid phone format, but it succeeded.');
    } catch (err) {
      console.log('✅ Validator successfully caught invalid phone format:', err.message);
    }

    // Test validation failure for invalid channel preference
    try {
      const invalidCustomer = new Customer({
        name: 'Invalid Preference User',
        email: 'invalidpref@test.com',
        phone: '+919876543210',
        channel_preference: 'invalid_pref' // should fail
      });
      await invalidCustomer.validate();
      console.error('❌ Expected validation to fail for invalid channel preference, but it succeeded.');
    } catch (err) {
      console.log('✅ Validator successfully caught invalid channel_preference:', err.message);
    }

    // Save a valid customer
    const validCustomer = new Customer({
      name: 'Coffee Lover',
      email: `coffee.lover.${Date.now()}@example.com`,
      phone: '+919876543210',
      channel_preference: 'whatsapp',
      tags: ['espresso', 'regular'],
      total_orders: 1,
      total_spend: 150
    });
    const savedCustomer = await validCustomer.save();
    console.log('✅ Customer saved successfully:', savedCustomer._id);

    // 2. Verify Order Schema
    console.log('\n--- Verifying Order Model ---');
    const validOrder = new Order({
      customer_id: savedCustomer._id,
      items: [
        { name: 'Espresso', quantity: 1, price: 150 }
      ],
      total_amount: 150,
      channel: 'app',
      outlet: 'MG Road Metro'
    });
    const savedOrder = await validOrder.save();
    console.log('✅ Order saved successfully:', savedOrder._id);

    // 3. Verify Segment Schema
    console.log('\n--- Verifying Segment Model ---');
    const validSegment = new Segment({
      name: 'High Spenders',
      description: 'Customers with total spend > 100',
      type: 'rule_based',
      rules: [
        { field: 'total_spend', operator: 'gt', value: 100 }
      ],
      customer_count: 1,
      last_computed_at: new Date()
    });
    const savedSegment = await validSegment.save();
    console.log('✅ Segment saved successfully:', savedSegment._id);

    // 4. Verify Campaign Schema
    console.log('\n--- Verifying Campaign Model ---');
    const validCampaign = new Campaign({
      name: 'Weekend Espresso Discount',
      segment_id: savedSegment._id,
      channel: 'whatsapp',
      message_template: 'Hey {{name}}, get 10% off on your favourite Espresso this weekend!',
      ai_generated: true,
      status: 'draft',
      stats: { total: 100, sent: 0 }
    });
    const savedCampaign = await validCampaign.save();
    console.log('✅ Campaign saved successfully:', savedCampaign._id);

    // 5. Verify Communication Schema
    console.log('\n--- Verifying Communication Model ---');
    
    // Save communication 1 (without external_msg_id to verify sparse uniqueness constraint)
    const validComm1 = new Communication({
      campaign_id: savedCampaign._id,
      customer_id: savedCustomer._id,
      channel: 'whatsapp',
      message: 'Hey Coffee Lover, get 10% off on your favourite Espresso this weekend!',
      status: 'queued'
    });
    const savedComm1 = await validComm1.save();
    console.log('✅ Communication 1 saved (without external_msg_id) successfully:', savedComm1._id);

    // Save communication 2 (with external_msg_id)
    const validComm2 = new Communication({
      campaign_id: savedCampaign._id,
      customer_id: savedCustomer._id,
      channel: 'whatsapp',
      message: 'Hey Coffee Lover, get 10% off on your favourite Espresso this weekend!',
      status: 'sent',
      external_msg_id: `msg_ext_${Date.now()}`
    });
    const savedComm2 = await validComm2.save();
    console.log('✅ Communication 2 saved (with external_msg_id) successfully:', savedComm2._id);

    // Test external_msg_id uniqueness constraint
    try {
      const duplicateComm = new Communication({
        campaign_id: savedCampaign._id,
        customer_id: savedCustomer._id,
        channel: 'whatsapp',
        message: 'Hey Coffee Lover, get 10% off on your favourite Espresso this weekend!',
        status: 'sent',
        external_msg_id: savedComm2.external_msg_id // duplicate id
      });
      await duplicateComm.save();
      console.error('❌ Expected unique constraint on external_msg_id to fail, but it succeeded.');
    } catch (err) {
      console.log('✅ Unique constraint caught duplicate external_msg_id:', err.message);
    }

    // Clean up all test data created
    console.log('\n--- Cleaning up Test Data ---');
    await Communication.deleteMany({ campaign_id: savedCampaign._id });
    await Campaign.deleteOne({ _id: savedCampaign._id });
    await Segment.deleteOne({ _id: savedSegment._id });
    await Order.deleteOne({ _id: savedOrder._id });
    await Customer.deleteOne({ _id: savedCustomer._id });
    console.log('✅ Cleaned up all test records successfully.');

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
  } finally {
    console.log('Closing mongoose connection...');
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

main();
