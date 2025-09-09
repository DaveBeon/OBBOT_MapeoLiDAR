// src/utils/validateUser.js
const userTemplate = require("../models/userSchema.js");

function validateUser(data) {
  const validated = {};

  console.log(userTemplate);

  for (const [key, rules] of Object.entries(userTemplate)) {
    let value = data[key];
    // Si el valor no viene
    if (value === undefined || value === null) {
      if (rules.required && rules.default === undefined) {
        throw new Error(`The field "${key}" is required.`);
      }
      validated[key] = typeof rules.default === "function" ? rules.default() : rules.default;
      continue;
    }

    // Validación de tipo
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
        if (typeof value === "string") value = new Date(value);
        if (!(value instanceof Date) || isNaN(value.getTime())) {
          throw new Error(`"${key}" must be a valid Date.`);
        }
        break;
      case "array":
        if (!Array.isArray(value)) throw new Error(`"${key}" must be an array.`);
        break;
      case "object":
        if (typeof value !== "object" || Array.isArray(value)) {
          throw new Error(`"${key}" must be an object.`);
        }
        break;
      default:
        throw new Error(`Unknown type for field "${key}".`);
    }

    validated[key] = value;
  }

  return validated;
}

module.exports = {
  validateUser,
};
