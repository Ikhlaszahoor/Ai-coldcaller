const express = require("express");
const router = express.Router();
const Anthropic = require("@anthropic-ai/sdk");
const multer = require("multer");
const { parse } = require("csv-parse/sync");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Multer - CSV file upload (memory storage, no disk save needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files allowed"), false);
    }
  },
});

// ─────────────────────────────────────────────
// POST /api/generate-script
// Generate personalized cold call script
// ─────────────────────────────────────────────
router.post("/generate-script", async (req, res) => {
  const { name, company, role, industry, offering } = req.body;

  if (!name || !offering) {
    return res.status(400).json({ error: "Name and offering are required" });
  }

  const prompt = `You are a world-class cold calling expert with 15+ years of B2B sales experience.

Generate a complete, professional cold call script for:
- Prospect: ${name}
- Company: ${company || "their company"}
- Role: ${role || "Decision Maker"}
- Industry: ${industry || "their industry"}
- What you are selling: ${offering}

Structure the script with these exact sections:

**OPENING (0-10 seconds)**
Hook line that grabs attention immediately. Do NOT start with "Is this a bad time?"

**VALUE PITCH (10-30 seconds)**
One specific pain point this industry faces + how your solution fixes it. Be specific, not generic.

**QUALIFYING QUESTION**
One smart question to understand if they are a fit.

**COMMON OBJECTION HANDLER**
Handle the most likely objection (usually "not interested" or "send me an email") naturally.

**CLOSE / NEXT STEP**
Clear ask for a 15-minute meeting or follow-up call.

Use [PAUSE] for natural breathing moments.
Use (softly) or (confidently) for tone cues.
Keep total length under 350 words.
Make it sound like a real human, not a robot.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ script: message.content[0].text });
  } catch (err) {
    console.error("Script generation error:", err.message);
    res.status(500).json({ error: "Failed to generate script. Check your API key." });
  }
});

// ─────────────────────────────────────────────
// POST /api/handle-objection
// Real-time objection handling during call
// ─────────────────────────────────────────────
router.post("/handle-objection", async (req, res) => {
  const { objection, context } = req.body;

  if (!objection) {
    return res.status(400).json({ error: "Objection text is required" });
  }

  const prompt = `You are a sales expert. A prospect just said: "${objection}"

Context about what is being sold: ${context || "a business solution"}

Give me:
1. A short, natural rebuttal (2-3 sentences max)
2. A follow-up question to keep the conversation going

Respond in this exact format:
REBUTTAL: [your rebuttal here]
FOLLOW-UP: [your follow-up question here]

Be conversational, empathetic, and never pushy.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].text;
    const rebuttals = text.match(/REBUTTAL:\s*(.+?)(?=FOLLOW-UP:|$)/s);
    const followup = text.match(/FOLLOW-UP:\s*(.+)/s);

    res.json({
      rebuttal: rebuttals ? rebuttals[1].trim() : text,
      followUp: followup ? followup[1].trim() : "",
    });
  } catch (err) {
    console.error("Objection handler error:", err.message);
    res.status(500).json({ error: "Failed to handle objection." });
  }
});

// ─────────────────────────────────────────────
// POST /api/parse-csv
// Parse uploaded CSV of prospects
// ─────────────────────────────────────────────
router.post("/parse-csv", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  try {
    const records = parse(req.file.buffer.toString(), {
      columns: true,          // First row = column headers
      skip_empty_lines: true,
      trim: true,
    });

    // Normalize column names to lowercase for flexibility
    const normalized = records.map((row) => {
      const lower = {};
      Object.keys(row).forEach((k) => {
        lower[k.toLowerCase().trim()] = row[k];
      });
      return {
        name: lower.name || lower["full name"] || lower["prospect name"] || "",
        company: lower.company || lower["company name"] || "",
        role: lower.role || lower.title || lower.position || "",
        industry: lower.industry || lower.sector || "",
        phone: lower.phone || lower["phone number"] || lower.mobile || "",
        email: lower.email || lower["email address"] || "",
      };
    });

    // Filter out rows with no name
    const valid = normalized.filter((r) => r.name.trim() !== "");

    res.json({ prospects: valid, total: valid.length });
  } catch (err) {
    console.error("CSV parse error:", err.message);
    res.status(400).json({ error: "Invalid CSV format. Check your file." });
  }
});

module.exports = router;
