const https = require("https");

const SYSTEM_INSTRUCTION = `You are an expert C Programming AI Tutor named "C Buddy". Your ONLY purpose is to help users with everything related to the C programming language.

You handle all C topics: variables, data types, operators, control flow (if/else/switch), loops (for/while/do-while), arrays, strings, functions, recursion, pointers, pointer arithmetic, structures, unions, enumerations, typedef, dynamic memory allocation (malloc/calloc/realloc/free), file handling, preprocessor directives, storage classes, bitwise operators, command-line arguments, the C standard library, data structures in C (linked lists, stacks, queues, trees), algorithms in C, debugging (syntax/logical/runtime/memory errors).

RESPONSE RULES:
- Conceptual questions: give definition → example → explanation.
- Code requests: provide complete compilable C code with comments, then explain it.
- Debugging: identify all errors, explain why they occur, provide corrected code.
- Output prediction: trace step by step, give exact output, flag undefined behavior explicitly.
- Always use triple-backtick C code blocks.
- Always consider conversation context for follow-up questions.
- If not related to C/programming: politely say "I'm C Buddy, specialized in C programming. Please ask me a C-related question!"
- Be friendly, patient, and use simple language suitable for a college student.`;

module.exports = async (req, res) => {
  // CORS headers — allow the GitHub Pages frontend as well as Vercel domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  const { message, history = [] } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  // Models to try in order
  const MODELS = [
    "gemini-3.6-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
  ];

  const contents = [
    { role: "user",  parts: [{ text: "You are C Buddy — follow your C tutor instructions." }] },
    { role: "model", parts: [{ text: "Understood! I'm C Buddy, your C Programming AI Tutor. Ready to help!" }] },
    ...history,
    { role: "user",  parts: [{ text: message.trim() }] },
  ];

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents,
    generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 8192 },
  });

  for (const model of MODELS) {
    try {
      const reply = await callGemini(model, body, apiKey);
      if (reply !== null) {
        return res.status(200).json({ reply });
      }
    } catch (err) {
      if (err.status === 404) continue; // try next model
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(503).json({ error: "No Gemini model is available right now. Please try again later." });
};

function callGemini(model, body, apiKey) {
  return new Promise((resolve, reject) => {
    const path = `/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };

    const req = https.request(options, (geminiRes) => {
      let data = "";
      geminiRes.on("data", (chunk) => { data += chunk; });
      geminiRes.on("end", () => {
        if (geminiRes.statusCode === 404) {
          return reject({ status: 404, message: "Model not found" });
        }
        if (geminiRes.statusCode !== 200) {
          let errMsg = `Gemini error ${geminiRes.statusCode}`;
          try { errMsg = JSON.parse(data)?.error?.message || errMsg; } catch (_) {}
          return reject({ status: geminiRes.statusCode, message: errMsg });
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || null;
          resolve(text);
        } catch (_) {
          reject({ status: 500, message: "Failed to parse Gemini response" });
        }
      });
    });

    req.on("error", (e) => reject({ status: 500, message: e.message }));
    req.write(body);
    req.end();
  });
}
