 const userTemplate = {
  firstName: { required: true, type: "string" },
  lastName: { required: true, type: "string" },
  username: { required: true, type: "string" },
  password: { required: true, type: "string" },
  role: { required: false, type: "string", default: "user" },
  active: { required: false, type: "boolean", default: true },
  createdAt: { required: true, type: "date", default: () => new Date() },
};

module.exports = userTemplate;
