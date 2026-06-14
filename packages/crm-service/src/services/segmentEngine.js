/**
 * Helper function to parse date fields if they are strings.
 * @param {string} field - The schema field name
 * @param {any} val - The value to parse
 * @returns {any} The parsed value
 */
function parseValue(field, val) {
  if ((field === 'last_order_date' || field === 'first_order_date') && typeof val === 'string') {
    const parsedDate = new Date(val);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  return val;
}

/**
 * Translates a segment's rules array into a MongoDB query object.
 * @param {Array} rules - Array of rule objects
 * @returns {Object} MongoDB query filter object
 */
function buildMongoQuery(rules) {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return {};
  }

  const andConditions = [];

  for (const rule of rules) {
    const { field, operator, value, value2 } = rule;
    if (!field || !operator) {
      continue;
    }

    const parsedValue = parseValue(field, value);
    const parsedValue2 = parseValue(field, value2);

    let condition;

    switch (operator) {
      case 'gt':
        condition = { [field]: { $gt: parsedValue } };
        break;
      case 'gte':
        condition = { [field]: { $gte: parsedValue } };
        break;
      case 'lt':
        condition = { [field]: { $lt: parsedValue } };
        break;
      case 'lte':
        condition = { [field]: { $lte: parsedValue } };
        break;
      case 'eq':
      case 'contains':
        condition = { [field]: parsedValue };
        break;
      case 'between':
        condition = { [field]: { $gte: parsedValue, $lte: parsedValue2 } };
        break;
      case 'in_last_days': {
        const days = Number(value);
        if (!isNaN(days)) {
          condition = { [field]: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } };
        }
        break;
      }
      case 'older_than_days': {
        const days = Number(value);
        if (!isNaN(days)) {
          condition = { [field]: { $lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } };
        }
        break;
      }
      default:
        // Ignore unsupported/unknown operators
        break;
    }

    if (condition) {
      andConditions.push(condition);
    }
  }

  if (andConditions.length === 0) {
    return {};
  }

  return { $and: andConditions };
}

module.exports = {
  buildMongoQuery
};
