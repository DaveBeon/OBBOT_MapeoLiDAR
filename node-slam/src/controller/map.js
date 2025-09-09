const { mapsDB } = require("../config/dbConf.js");
const { validateMap } = require("../utils/validateMap.js");

// Create a new map
const createMap = async (data) => {
  const mapData = validateMap(data);
  return await mapsDB.insert(mapData);
};

// Get all maps
const getMaps = async (userId, limit = 50) => {
  return await mapsDB
    .find({ userId }) // filtra por usuario
    .sort({ createdAt: -1 }) // los más recientes primero
    .limit(limit); // opcional: limitar resultados
};

// Get map by ID
const getMapById = async (id) => {
  return await mapsDB.findOne({ id });
};

// Update map by ID
const updateMap = async (id, updates) => {
  return await mapsDB.update({ id }, { $set: updates });
};

// Delete map by ID
const deleteMap = async (id) => {
  return await mapsDB.remove({ _id: id });
};

module.exports = {
  createMap,
  getMaps,
  getMapById,
  updateMap,
  deleteMap,
  };
