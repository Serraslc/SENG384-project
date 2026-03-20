require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

pool
  .query(`
    CREATE TABLE IF NOT EXISTS people (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE
    );
  `)
  .then(() => console.log("People table ready"))
  .catch((err) => console.error("Table creation error:", err));

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.get("/api/people", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM people ORDER BY id ASC");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.get("/api/people/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM people WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.post("/api/people", async (req, res) => {
  const { full_name, email } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: "FULL_NAME_REQUIRED" });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "EMAIL_REQUIRED" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "INVALID_EMAIL_FORMAT" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO people (full_name, email) VALUES ($1, $2) RETURNING *",
      [full_name.trim(), email.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }

    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.put("/api/people/:id", async (req, res) => {
  const { id } = req.params;
  const { full_name, email } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: "FULL_NAME_REQUIRED" });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "EMAIL_REQUIRED" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "INVALID_EMAIL_FORMAT" });
  }

  try {
    const result = await pool.query(
      "UPDATE people SET full_name = $1, email = $2 WHERE id = $3 RETURNING *",
      [full_name.trim(), email.trim().toLowerCase(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }

    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.delete("/api/people/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM people WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});