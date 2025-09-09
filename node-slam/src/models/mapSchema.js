// src/models/mapTemplate.js

const mapTemplate = {
  userId: { required: true, type: "string" },
  name: { required: true, type: "string" },
  status: { required: true, type: "string" },
  date: { required: true, type: "string", default: () => new Date().toISOString() },
  size: { required: false, type: "number", default: 0 },
  points: { required: false, type: "number", default: 0 },
  area: { required: false, type: "string", default: "0m²" },
  duration: { required: false, type: "string", default: "0min" },
  quality: { required: false, type: "number", default: 0 },
  landmarks: { required: false, type: "number", default: 0 },
  loops: { required: false, type: "number", default: 0 },
  createdAt: { required: true, type: "string", default: () => new Date().toISOString() },
};

module.exports = mapTemplate;
