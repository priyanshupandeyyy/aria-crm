const path = require('path');
// Load environment variables from packages/crm-service/.env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

const FIRST_NAMES = [
  'Rahul', 'Priya', 'Amit', 'Neha', 'Vikram', 'Sunita', 'Rajesh', 'Pooja', 'Arun', 'Kavita',
  'Harpreet', 'Gurpreet', 'Jaspreet', 'Simran', 'Paramjit', 'Karthik', 'Divya', 'Murugan', 'Lakshmi', 'Senthil',
  'Meenakshi', 'Sourav', 'Mitali', 'Debashish', 'Anirban', 'Rohan', 'Sneha', 'Arjun', 'Ishaan', 'Nisha',
  'Tarun', 'Pallavi', 'Vivek', 'Shreya', 'Manish'
];

const LAST_NAMES = [
  'Sharma', 'Singh', 'Patel', 'Kumar', 'Gupta', 'Nair', 'Iyer', 'Chatterjee', 'Verma', 'Reddy',
  'Mehta', 'Joshi', 'Malhotra', 'Kapoor', 'Bose', 'Pillai', 'Menon', 'Rao', 'Saxena', 'Chaudhary'
];

const CHANNELS = ['whatsapp', 'sms', 'email', 'rcs'];
const ORDER_CHANNELS = ['in-store', 'app', 'online'];
const OUTLETS = ['Connaught Place', 'Bandra West', 'Koramangala', 'T. Nagar', 'Salt Lake'];

const COFFEE_MENU = [
  { name: 'Cappuccino', price: 120 },
  { name: 'Cold Brew', price: 180 },
  { name: 'Espresso', price: 90 },
  { name: 'Latte', price: 150 },
  { name: 'Flat White', price: 160 },
  { name: 'Americano', price: 110 },
  { name: 'Iced Coffee', price: 140 },
  { name: 'Matcha Latte', price: 170 },
  { name: 'Croissant', price: 80 },
  { name: 'Blueberry Muffin', price: 70 }
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Shuffles an array to select unique items
const shuffleArray = (arr) => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Generates an Indian phone number format +91XXXXXXXXXX starting with 6, 7, 8, or 9
const generateIndianPhone = () => {
  const firstDigit = pickRandom(['6', '7', '8', '9']);
  let restDigits = '';
  for (let i = 0; i < 9; i++) {
    restDigits += Math.floor(Math.random() * 10);
  }
  return `+91${firstDigit}${restDigits}`;
};

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI is not defined in the environment.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected successfully!');

  // Clear existing collections
  console.log('Clearing existing Customer and Order collections...');
  await Customer.deleteMany({});
  await Order.deleteMany({});
  console.log('Collections cleared.');

  const nowMs = Date.now();
  const DAY_IN_MS = 24 * 60 * 60 * 1000;

  const customersData = [];
  const behaviors = [];

  // Define behavior limits for 500 customers:
  // - Index 0 to 149: regulars (150)
  // - Index 150 to 299: occasional (150)
  // - Index 300 to 399: new (100)
  // - Index 400 to 499: lapsed (100)
  for (let i = 0; i < 500; i++) {
    const firstName = pickRandom(FIRST_NAMES);
    const lastName = pickRandom(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@brewandco.in`;
    const phone = generateIndianPhone();
    const channelPreference = pickRandom(CHANNELS);

    let behaviorType;
    if (i < 150) {
      behaviorType = 'regulars';
    } else if (i < 300) {
      behaviorType = 'occasional';
    } else if (i < 400) {
      behaviorType = 'new';
    } else {
      behaviorType = 'lapsed';
    }

    customersData.push({
      name: `${firstName} ${lastName}`,
      email,
      phone,
      channel_preference: channelPreference,
      tags: [],
      total_orders: 0,
      total_spend: 0,
      avg_order_value: 0,
      is_churned: false
    });

    behaviors.push(behaviorType);
  }

  console.log('Inserting 500 customer skeleton profiles...');
  const insertedCustomers = await Customer.insertMany(customersData);
  console.log('Customers inserted successfully.');

  const ordersToInsert = [];
  const customerUpdates = [];

  console.log('Generating order histories based on behavior rules...');
  for (let idx = 0; idx < insertedCustomers.length; idx++) {
    const customer = insertedCustomers[idx];
    const behavior = behaviors[idx];
    const customerId = customer._id;

    let numOrders = 0;
    let lastOrderGapDays = 0;
    let minSpacingDays = 0;
    let maxSpacingDays = 0;

    switch (behavior) {
      case 'regulars':
        // 20 to 50 orders, last order within past 7 days, orders every 2-4 days
        numOrders = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
        lastOrderGapDays = Math.random() * 7;
        minSpacingDays = 2;
        maxSpacingDays = 4;
        break;
      case 'occasional':
        // 5 to 15 orders, last order within past 30 days, orders every 7-14 days
        numOrders = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
        lastOrderGapDays = Math.random() * 30;
        minSpacingDays = 7;
        maxSpacingDays = 14;
        break;
      case 'new':
        // 1 to 4 orders, last order within past 14 days, spacing ~ 2-8 days
        numOrders = Math.floor(Math.random() * (4 - 1 + 1)) + 1;
        lastOrderGapDays = Math.random() * 14;
        minSpacingDays = 2;
        maxSpacingDays = 8;
        break;
      case 'lapsed':
        // 10 to 25 old orders, last order between 35 and 80 days ago, orders every 3-7 days
        numOrders = Math.floor(Math.random() * (25 - 10 + 1)) + 10;
        lastOrderGapDays = Math.random() * (80 - 35) + 35;
        minSpacingDays = 3;
        maxSpacingDays = 7;
        break;
    }

    // Determine the last order date relative to now
    let currentOrderTimeMs = nowMs - (lastOrderGapDays * DAY_IN_MS);
    const customerOrderDates = [];
    let customerTotalSpend = 0;

    // Generate orders backwards from the lastOrderDate
    for (let o = 0; o < numOrders; o++) {
      // Setup random menu items (1 to 3 items per order, unique items per order)
      const numItems = Math.floor(Math.random() * 3) + 1;
      const shuffledMenu = shuffleArray(COFFEE_MENU);
      const itemsList = [];
      let orderTotalAmount = 0;

      for (let k = 0; k < numItems; k++) {
        const menuItem = shuffledMenu[k];
        const quantity = Math.floor(Math.random() * 2) + 1; // quantity 1 or 2
        itemsList.push({
          name: menuItem.name,
          quantity,
          price: menuItem.price
        });
        orderTotalAmount += menuItem.price * quantity;
      }

      const orderChannel = pickRandom(ORDER_CHANNELS);
      const orderOutlet = pickRandom(OUTLETS);
      const orderedAtDate = new Date(currentOrderTimeMs);

      customerOrderDates.push(orderedAtDate);
      customerTotalSpend += orderTotalAmount;

      ordersToInsert.push({
        customer_id: customerId,
        items: itemsList,
        total_amount: orderTotalAmount,
        channel: orderChannel,
        ordered_at: orderedAtDate,
        outlet: orderOutlet
      });

      // Subtract spacing for the next order (going backwards in history)
      const gapDays = Math.random() * (maxSpacingDays - minSpacingDays) + minSpacingDays;
      currentOrderTimeMs -= gapDays * DAY_IN_MS;
    }

    // Sort order dates ascending for calculation convenience
    customerOrderDates.sort((a, b) => a - b);
    const firstOrderDate = customerOrderDates[0];
    const lastOrderDate = customerOrderDates[customerOrderDates.length - 1];

    // Calculate visit frequency (average gap between consecutive orders)
    let visitFrequencyDays = null;
    if (numOrders > 1) {
      const totalGapMs = lastOrderDate - firstOrderDate;
      const avgGapDays = totalGapMs / (DAY_IN_MS * (numOrders - 1));
      visitFrequencyDays = Math.round(avgGapDays * 100) / 100;
    }

    // Determine churn: last_order_date is older than 45 days AND total_orders > 3
    const fortyFiveDaysAgoMs = nowMs - (45 * DAY_IN_MS);
    const isChurned = (lastOrderDate.getTime() < fortyFiveDaysAgoMs) && (numOrders > 3);

    // Formulate Customer Tags
    const tags = [];
    if (numOrders > 15) tags.push('regular');
    if (customerTotalSpend > 5000) tags.push('high_value');
    if (isChurned) tags.push('lapsed');
    if (numOrders <= 4) tags.push('new');

    const avgOrderValue = Math.round((customerTotalSpend / numOrders) * 100) / 100;

    // Prepare Customer bulk write update
    customerUpdates.push({
      updateOne: {
        filter: { _id: customerId },
        update: {
          $set: {
            total_orders: numOrders,
            total_spend: customerTotalSpend,
            avg_order_value: avgOrderValue,
            first_order_date: firstOrderDate,
            last_order_date: lastOrderDate,
            visit_frequency_days: visitFrequencyDays,
            is_churned: isChurned,
            tags: tags
          }
        }
      }
    });
  }

  console.log(`Inserting ${ordersToInsert.length} orders in bulk...`);
  await Order.insertMany(ordersToInsert);
  console.log('Orders inserted successfully.');

  console.log('Updating customer aggregate fields...');
  await Customer.bulkWrite(customerUpdates);
  console.log('Customer aggregates updated successfully.');

  console.log(`✅ Seeded 500 customers and ${ordersToInsert.length} total orders`);
}

async function main() {
  try {
    await seed();
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
  } finally {
    console.log('Closing mongoose connection...');
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

main();
