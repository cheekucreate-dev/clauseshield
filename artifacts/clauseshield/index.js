import express from "express";
import Groq from "groq-sdk";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});
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
      counter_proposal: "A balanced, fair, and legally protective rewrite that protects the user without alienating the counterparty.",
      negotiation_tip: "A concise, polite 1-2 sentence explanation for justifying this change in an email or negotiation.",
    },
  ],
};

function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  return new Groq({ apiKey });
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
  if (!result || typeof result !== "object") {
    result = {};
  }

  // Fallbacks set karna taaki crash na ho
  if (typeof result.contract_summary !== "string") {
    result.contract_summary = "Contract audit summary generated successfully.";
  }

  const score = Number(result.overall_risk_score);
  result.overall_risk_score = (!isNaN(score) && score >= 0 && score <= 100) ? Math.round(score) : 75;

  if (!Array.isArray(result.issues_detected)) {
    result.issues_detected = [];
  }


  // Safe issue sanitization (no crashes, accepts whatever Groq provides)
  result.issues_detected = (result.issues_detected || []).map((issue) => ({
    trap_category: issue?.trap_category || "Contract Risk",
    severity: issue?.severity || "High",
    clause_quote: issue?.clause_quote || "Referenced contract section.",
    plain_english_risk: issue?.plain_english_risk || "Potential exposure detected in this clause.",
    counter_clause: issue?.counter_clause || "Standard mutual liability and payment protections.",
    counter_proposal: issue?.counter_proposal || "Request amendments to balance obligations.",
    negotiation_tip: issue?.negotiation_tip || "Negotiate standard market terms before signing."
  }));

  return result;
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "clauseshield" });
});

app.post("/api/analyze", upload.single("contract"), async (req, res) => {
  let parser;
  try {
    const pastedText =
      typeof req.body?.contractText === "string"
        ? req.body.contractText.replace(/\s+/g, " ").trim()
        : "";
    let contractText = pastedText;

    if (!contractText && !req.file) {
      return res.status(400).json({
        error: "Upload a contract PDF or paste contract text to analyze.",
      });
    }
    if (!contractText && !isPdfFile(req.file)) {
      return res.status(400).json({ error: "Only valid PDF files are supported." });
    }

    if (!contractText && req.file) {
      parser = new PDFParse({ data: req.file.buffer });
      const parsed = await parser.getText();
      contractText = parsed.text?.replace(/\s+/g, " ").trim();
    }

    if (!contractText) {
      return res.status(422).json({
        error:
          "No readable text was found in this PDF. Try an OCR-enabled PDF or paste the contract text.",
      });
    }

    const client = createGroqClient();
    const response = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are ClauseShield, a contract risk auditor for freelancers and small businesses. Return only valid JSON that exactly matches the requested schema. Audit only for the five specified trap categories. Do not invent clauses. If a category is absent, do not include an issue for it. Quote exact contract language when possible. Counter-clauses and counter-proposals must be practical replacement language, not general advice. Make each counter_proposal balanced, fair, and legally protective without sounding hostile to the counterparty. Make each negotiation_tip polite, concise, and 1-2 sentences long so the user can adapt it for an email or live negotiation.",
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
    const exactMessage =
      error instanceof Error ? error.message : String(error);
    console.error("Contract analysis failed:", exactMessage, error);
    const statusCode =
      exactMessage === "GROQ_API_KEY is not configured." ? 503 : 502;
    return res.status(statusCode).json({ error: exactMessage });
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "PDFs must be 15 MB or smaller." });
  }
  const exactMessage = error instanceof Error ? error.message : String(error);
  console.error("Request failed:", exactMessage, error);
  return res.status(500).json({ error: exactMessage });
});
// Razorpay Order Creation
app.post("/api/create-order", async (req, res) => {
  try {
    const options = {
      amount: 199 * 100, // ₹199 in paise
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ error: "Failed to create payment order." });
  }
});

// Razorpay Payment Verification
app.post("/api/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      return res.json({ status: "success", verified: true });
    } else {
      return res.status(400).json({ status: "failed", error: "Invalid signature" });
    }
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Payment verification failed." });
  }
});
app.listen(port, "0.0.0.0", () => {
  console.info(`ClauseShield listening on port ${port}`);
});
