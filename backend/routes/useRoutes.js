const express = require("express");
const router = express.Router();

const { createUser } = require("../db/mongo");

router.post("/create", async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const result = await createUser({ name, email, role });

    res.json({
      success: true,
      insertedId: result.insertedId
    });
  } catch (err) {
    console.error("Failed to create user:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

module.exports = router;