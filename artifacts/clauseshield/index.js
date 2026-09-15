import express from "express";
import multer from "multer";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 5000);
const publicDir = path.join(__dirname, "public");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },
});

const auditSchema = {
  contract_summary: "A concise 2-4 sentence summary of the contract and its practical purpose.",
  overall_risk_score: "An integer from 0 to 100 where 0 is low risk and 100 is extreme risk.",
  issues_detected: [
    {
      trap_category: "One of: Unlimited Indemnification & Liability, Predatory Payment terms, IP Overreach, Kill Fees, Non-Compete clauses",
      severity: "One of: Critical, High, Medium, Low",
      clause_quote: "A short exact quote from the contract, or an empty string if the category is not present.",
      plain_english_risk: "A clear explanation of the business risk in plain English.",
      counter_clause: "A specific, negotiation-ready replacement clause.",
    },
  ],
};

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey });
}

function isPdfFile(file) {
  return (
    file &&
    (file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf") &&
    file.buffer.subarray(0, 4).toString("ascii") === "%PDF"
  );
}

function parseJsonResponse(content) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

function validateAuditResult(result) {
  if (
    !result ||
    typeof result.contract_summary !== "string" ||
    !Number.isInteger(result.overall_risk_score) ||
    result.overall_risk_score < 0 ||
    result.overall_risk_score > 100 ||
    !Array.isArray(result.issues_detected)
  ) {
    throw new Error("The AI returned an invalid audit structure.");
  }

  const allowedCategories = new Set([
    "Unlimited Indemnification & Liability",
    "Predatory Payment terms",
    "IP Overreach",
    "Kill Fees",
    "Non-Compete clauses",
  ]);
  const allowedSeverities = new Set(["Critical", "High", "Medium", "Low"]);

  for (const issue of result.issues_detected) {
    if (
      !issue ||
      !allowedCategories.has(issue.trap_category) ||
      !allowedSeverities.has(issue.severity) ||
      typeof issue.clause_quote !== "string" ||
      typeof issue.plain_english_risk !== "string" ||
      typeof issue.counter_clause !== "string"
    ) {
      throw new Error("The AI returned an invalid issue structure.");
    }
  }
  return result;
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "clauseshield" });
});

app.post("/api/analyze", upload.single("contract"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Upload a contract PDF to analyze." });
  }
  if (!isPdfFile(req.file)) {
    return res.status(400).json({ error: "Only valid PDF files are supported." });
  }

  let parser;
  try {
    parser = new PDFParse({ data: req.file.buffer });
    const parsed = await parser.getText();
    const contractText = parsed.text?.replace(/\s+/g, " ").trim();
    if (!contractText) {
      return res.status(422).json({
        error: "No readable text was found in this PDF. Try an OCR-enabled PDF.",
      });
    }

    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are ClauseShield, a contract risk auditor for freelancers and small businesses. Return only valid JSON that exactly matches the requested schema. Audit only for the five specified trap categories. Do not invent clauses. If a category is absent, do not include an issue for it. Quote exact contract language when possible. Counter-clauses must be practical replacement language, not general advice.",
        },
        {
          role: "user",
          content: `Audit the contract below for these five traps only:
1. Unlimited Indemnification & Liability
2. Predatory Payment terms
3. IP Overreach
4. Kill Fees
5. Non-Compete clauses

Return strictly this JSON shape:
${JSON.stringify(auditSchema, null, 2)}

Contract text:
${contractText.slice(0, 120000)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("The AI returned an empty audit.");
    }
    return res.json(validateAuditResult(parseJsonResponse(content)));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(502).json({ error: "The audit response was not valid JSON." });
    }
    if (error instanceof Error && error.message === "OPENAI_API_KEY is not configured.") {
      return res.status(503).json({
        error: "OpenAI is not configured yet. Add OPENAI_API_KEY in Secrets and try again.",
      });
    }
    console.error("Contract analysis failed:", error);
    return res.status(500).json({
      error: "The contract could not be analyzed. Check the PDF and try again.",
    });
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "PDFs must be 15 MB or smaller." });
  }
  console.error("Request failed:", error);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(port, "0.0.0.0", () => {
  console.info(`ClauseShield listening on port ${port}`);
});