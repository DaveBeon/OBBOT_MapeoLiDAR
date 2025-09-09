const express = require("express");
const router = express.Router();
const { createUser, getUsers, getUserByUsername, updateUser } = require("../controller/users");

router.get("/users", async (req, res) => {
  try {
    const usersList = await getUsers();
    const filteredUsers = usersList.map((user) => {
      const { _id: id, firstName, lastName, username, role } = user;
      return { id, firstName, lastName, username, role };
    });
    res.send(filteredUsers);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch users" });
  }
});

router.get("/:user", async (req, res) => {
  const { _id: id, firstName, lastName, username, role, active } = await getUserByUsername(req.params.user);
  res.send({ id, firstName, lastName, username, role, active });
});

router.post("/register", async (req, res) => {
  const userData = req.body;
  const user = await createUser(userData);
  res.status(200).json(user);
});

router.put("/changePassword/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const userData = await getUserByUsername(username);

    if (!userData) {
      return res.status(404).send("User not found");
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).send("New password is required");
    }

    // Si quieres hashear la contraseña
    // const hashedPassword = await bcrypt.hash(password, 10);
    // await updateUser(username, { password: hashedPassword });

    await updateUser(username, { password }); // sin hash

    res.send("Password updated successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.put("/activeUser/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const userData = await getUserByUsername(username);

    if (!userData) {
      return res.status(404).send("User not found");
    }

    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).send("Invalid input");
    }

    await updateUser(username, { active: isActive });
    res.send("User status updated successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.post("/login", async (req, res) => {
  if (!req.body?.username || !req.body?.password) {
    return res.status(400).send({ error: "Username and password are required" });
  }

  const user = await getUserByUsername(req.body.username);  
  if (!user || user.password !== req.body.password) {
    return res.status(401).send({ error: "Invalid credentials" });
  }

  if (!user.active) {
    return res.status(403).send({ error: "User is not active" });
  }

  res.send({
    id: user?._id,
    firstName: user?.firstName,
    lastName: user?.lastName,
    username: user?.username,
    role: user?.role,
  });
});

module.exports = router;
