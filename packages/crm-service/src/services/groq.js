const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Converts a natural-language segment description into MongoDB filter rules
 * using the Groq model.
 *
 * @param {string} naturalLanguageQuery - Plain English description of the desired segment.
 * @returns {Promise<Object>} Parsed JSON with segment_name, description, and rules array.
 */
async function generateSegmentRules(naturalLanguageQuery) {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a CRM data analyst for a coffee brand called Brew & Co.
Convert the user's natural language query into MongoDB filter rules.
Today's date: ${today}

Customer schema fields available:
- total_spend: Number (lifetime spend in rupees)
- total_orders: Number (lifetime order count)
- last_order_date: Date (most recent order)
- avg_order_value: Number (rupees)
- visit_frequency_days: Number (avg days between orders)
- is_churned: Boolean
- tags: Array of strings like ['regular', 'high_value', 'lapsed']

Operators available: gt, gte, lt, lte, eq, between, in_last_days, older_than_days

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "segment_name": "string",
  "description": "string",
  "rules": [
    { "field": "string", "operator": "string", "value": "any", "value2": "any (optional)" }
  ]
}

User query: "${naturalLanguageQuery}"`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });
    
    const text = completion.choices[0]?.message?.content || "";

    try {
      return JSON.parse(text);
    } catch {
      throw new Error('AI could not parse segment rules');
    }
  } catch (err) {
    console.error('generateSegmentRules error:', err);
    throw err.message === 'AI could not parse segment rules'
      ? err
      : new Error('Failed to generate segment rules from AI');
  }
}

/**
 * Generates three WhatsApp message variants for a given customer segment.
 *
 * @param {string} segmentName - Name of the target segment.
 * @param {string} segmentDescription - Description of the segment.
 * @param {Array<Object>} sampleCustomers - A few sample customer objects for context.
 * @returns {Promise<Array<Object>>} Array of variant objects with tone, message, and why.
 */
async function generateMessageVariants(segmentName, segmentDescription, sampleCustomers) {
  const prompt = `You are a marketing copywriter for Brew & Co., a premium coffee brand in India.

Write 3 WhatsApp message variants for the following customer segment:

Segment name: ${segmentName}
Description: ${segmentDescription}
Sample customers: ${JSON.stringify(sampleCustomers)}

Rules:
- Max 160 characters per message
- Use {name} as a personalization placeholder
- Variant 1: warm & friendly tone
- Variant 2: urgency/FOMO tone
- Variant 3: exclusive offer tone
- Include a "why" field explaining the approach in one line

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "variants": [
    { "tone": "string", "message": "string", "why": "string" }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });
    
    const text = completion.choices[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(text);
      return parsed.variants;
    } catch {
      throw new Error('AI could not parse message variants');
    }
  } catch (err) {
    console.error('generateMessageVariants error:', err);
    throw err.message === 'AI could not parse message variants'
      ? err
      : new Error('Failed to generate message variants from AI');
  }
}

/**
 * Produces a plain-English campaign performance insight for non-technical stakeholders.
 *
 * @param {string} campaignName - Name of the campaign.
 * @param {string} segmentName - Name of the targeted segment.
 * @param {Object} stats - Campaign delivery/engagement statistics.
 * @param {Object} accountAverages - Account-wide average benchmarks for comparison.
 * @returns {Promise<string>} 3-4 sentence insight in conversational tone.
 */
async function analyzeCampaign(campaignName, segmentName, stats, accountAverages) {
  const prompt = `You are a marketing analyst for Brew & Co.
Write a plain-English insight for a non-technical marketing manager.
Include what worked, what to watch, and one concrete next-step recommendation.
Max 80 words. Conversational tone.

Campaign: ${campaignName}
Segment: ${segmentName}
Stats: ${JSON.stringify(stats)}
Account averages: ${JSON.stringify(accountAverages)}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    return completion.choices[0]?.message?.content || "";
  } catch (err) {
    console.error('analyzeCampaign error:', err);
    throw new Error('Failed to generate campaign analysis from AI');
  }
}

module.exports = {
  generateSegmentRules,
  generateMessageVariants,
  analyzeCampaign,
};
