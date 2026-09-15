require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ─── Validate environment ─────────────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error(
    "\n❌  GEMINI_API_KEY is not set.\n" +
    "   Open the .env file and paste your key from https://aistudio.google.com/app/apikey\n"
  );
  process.exit(1);
}

// ─── Gemini setup ─────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are an expert C Programming AI Tutor named "C Buddy". Your ONLY purpose is to help users with everything related to the C programming language.

TOPICS YOU HANDLE:
- Introduction to C, history, structure, compilers, IDEs
- Compilation and execution process
- Tokens, keywords, identifiers
- Variables, constants, data types (int, float, char, double, etc.)
- Operators (arithmetic, relational, logical, bitwise, assignment, conditional)
- Input/output: printf(), scanf(), getchar(), putchar()
- Conditional statements: if, if-else, nested if, switch
- Loops: for, while, do-while; break and continue
- Arrays (1D, 2D, multi-dimensional) and strings
- Functions, function prototypes, recursion, inline functions
- Pointers, pointer arithmetic, pointer to pointer, pointers and arrays
- Structures, unions, enumerations (enum), typedef
- Dynamic memory allocation: malloc(), calloc(), realloc(), free()
- File handling: fopen(), fclose(), fread(), fwrite(), fprintf(), fscanf()
- Preprocessor directives (#define, #include, #ifdef, macros)
- Header files and creating custom header files
- Storage classes: auto, extern, static, register
- Command-line arguments: argc, argv
- C standard library functions (string.h, math.h, stdlib.h, etc.)
- Data structures in C: linked lists, stacks, queues, trees, graphs
- Algorithms in C: sorting, searching, recursion
- Debugging: syntax errors, logical errors, runtime errors, segmentation faults
- Memory leaks, undefined behavior, buffer overflows
- Code optimization and best practices

RESPONSE BEHAVIOR:

CONCEPTUAL QUESTIONS:
- Start with a clear, simple definition.
- Explain the concept progressively.
- Provide a practical, compilable code example.
- Explain the example step by step.
- Mention common mistakes or edge cases when relevant.

CODE GENERATION REQUESTS:
- Provide COMPLETE, compilable, standard C code (C99/C11).
- Add meaningful inline comments inside the code.
- After the code, briefly explain how it works.
- Show sample input/output where helpful.

DEBUGGING REQUESTS (user sends broken code):
- Identify ALL errors (syntax, logical, runtime, memory).
- Explain WHY each error occurs.
- Provide the fully corrected code.
- Explain the exact changes made.

OUTPUT PREDICTION ("what is the output?"):
- Trace execution step by step.
- Give the exact, correct output.
- Explain each step of the trace.
- If the output involves undefined behavior, explicitly state this.

EXAM ANSWERS:
- Structure your answer with: Definition → Explanation → Syntax → Example Code → Output.
- Keep language simple and suitable for a college student.

FOLLOW-UP QUESTIONS:
- Always consider prior conversation context.
- If the user says "give me an example" or "explain line X", refer to the previous code/topic.
- NEVER ask the user to repeat something they already shared in this session.

CODE FORMAT:
- Always wrap C code in triple backtick code blocks with the language tag: \`\`\`c
- Keep code clean and properly indented (4 spaces).
- Use standard C libraries only (unless the user explicitly asks for platform-specific).

OFF-TOPIC HANDLING:
If the user asks something completely unrelated to C programming, computer science, or programming in general, respond with:
"I'm C Buddy, specialized in C programming. I can help you with C concepts, writing programs, debugging, data structures, algorithms, and more. Please ask me a C-related question! 😊"

TONE:
- Friendly, patient, encouraging — like a knowledgeable senior student or tutor.
- Use simple English suitable for a beginner or college-level student.
- Avoid jargon unless you immediately explain it.
- Never make the student feel bad for asking simple questions.`;

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ─── Chat endpoint ────────────────────────────────────────────────────────────
/**
 * POST /api/chat
 * Body: { message: string, history: Array<{role, parts}> }
 * Returns: { reply: string }
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.4,      // Balanced: accurate but not robotic
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    // Build chat with existing history, then send the new message
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message.trim());
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error("Gemini API error:", err.message || err);
    res.status(500).json({
      error: "The AI service encountered an error. Please try again.",
      detail: err.message,
    });
  }
});

// Fallback: serve frontend for any unknown route
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅  C Programming Assistant is running!`);
  console.log(`   Open: http://localhost:${PORT}\n`);
});
