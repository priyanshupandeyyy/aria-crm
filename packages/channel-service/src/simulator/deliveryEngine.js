const axios = require('axios');

// Helper: sleep(ms) -> returns new Promise(resolve => setTimeout(resolve, ms))
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: randomBetween(min, max) -> returns Math.floor(Math.random() * (max - min + 1)) + min
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Retries posting payload to callback url up to 3 attempts.
 * @param {string} url - Callback URL
 * @param {Object} payload - Callback payload
 * @param {number} attempt - Current retry attempt
 */
async function callbackWithRetry(url, payload, attempt = 1) {
  try {
    await axios.post(url, payload);
  } catch (error) {
    console.error(`[Attempt ${attempt}] Callback failed for msg_id ${payload.msg_id}: ${error.message}`);
    if (attempt < 3) {
      const waitTime = attempt * 2000;
      await sleep(waitTime);
      return callbackWithRetry(url, payload, attempt + 1);
    } else {
      console.error("Dead letter: " + payload.msg_id);
    }
  }
}

/**
 * Simulates asynchronous delivery of a message and fires webhook events (delivered/failed, opened, clicked).
 * @param {string} msgId
 * @param {string} recipient
 * @param {string} channel
 * @param {string} message
 * @param {string} callbackUrl
 */
async function simulateDelivery(msgId, recipient, channel, message, callbackUrl) {
  try {
    // 1. Wait random 1000-3000ms
    await sleep(randomBetween(1000, 3000));

    // 2. Decide delivered: Math.random() > 0.15 (85% success)
    const delivered = Math.random() > 0.15;
    const status = delivered ? "delivered" : "failed";

    await callbackWithRetry(callbackUrl, {
      msg_id: msgId,
      status: status,
      timestamp: new Date()
    });

    if (!delivered) {
      return; // Stop here if delivery failed
    }

    // 3. If delivered: with 35% chance, wait 3000-8000ms then call callback with status "opened"
    const opened = Math.random() <= 0.35;
    if (!opened) {
      return;
    }

    await sleep(randomBetween(3000, 8000));
    await callbackWithRetry(callbackUrl, {
      msg_id: msgId,
      status: "opened",
      timestamp: new Date()
    });

    // 4. If opened: with 28% chance, wait 2000-6000ms then call callback with status "clicked"
    const clicked = Math.random() <= 0.28;
    if (!clicked) {
      return;
    }

    await sleep(randomBetween(2000, 6000));
    await callbackWithRetry(callbackUrl, {
      msg_id: msgId,
      status: "clicked",
      timestamp: new Date()
    });
  } catch (err) {
    console.error(`Error in simulateDelivery for msg_id ${msgId}:`, err);
  }
}

module.exports = {
  simulateDelivery,
  callbackWithRetry
};
