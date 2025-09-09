// src/utils/validateMap.js
const mapTemplate = require("../models/mapSchema.js");

function validateMap(data) {
  const validated = {};
  for (const [key, rules] of Object.entries(mapTemplate)) {
    const value = data[key];
    if (value === undefined || value === null) {
      if (rules.required && rules.default === undefined) {
        throw new Error(`The field "${key}" is required.`);
      }
      validated[key] = typeof rules.default === "function" ? rules.default() : rules.default;
    } else {
      switch (rules.type) {
        case "string":
          if (typeof value !== "string") throw new Error(`"${key}" must be a string.`);
          break;
        case "number":
          if (typeof value !== "number") throw new Error(`"${key}" must be a number.`);
          break;
        case "boolean":
          if (typeof value !== "boolean") throw new Error(`"${key}" must be a boolean.`);
          break;
        case "date":
          if (!(value instanceof Date)) throw new Error(`"${key}" must be a Date object.`);
          break;
        default:
          throw new Error(`Unknown type for field "${key}".`);
      }
      validated[key] = value;
    }
  }

  return validated;
}

module.exports = { validateMap };
