const { usersDB } = require('../config/dbConf.js');
const { validateUser } = require('../utils/validateUser.js');

// Create a new user
const createUser = async (data) => {
  const userData = validateUser(data);
  return await usersDB.insert(userData);
};

// Get all users
const getUsers = async () => {
  console.log("Fetching all users....");
  return await usersDB.find({});
};

// Get user by username
const getUserByUsername = async (username) => {
  return await usersDB.findOne({ username });
};

// Update user by username
const updateUser = async (username, updates) => {
  return await usersDB.update({ username }, { $set: updates });
};

// Delete user by username
const deleteUser = async (username) => {
  return await usersDB.remove({ username });
};

module.exports = {
  createUser,
  getUsers,
  getUserByUsername,
  updateUser,
  deleteUser
};
