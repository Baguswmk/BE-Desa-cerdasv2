require('dotenv').config();
const { Groq } = require('groq-sdk');

async function main() {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Test message" }],
      model: process.env.GROQ_MODEL && process.env.GROQ_MODEL !== "llama3-70b-8192" ? process.env.GROQ_MODEL : "llama-3.3-70b-versatile",
    });
    console.log("Success:", completion.choices[0]?.message?.content);
  } catch (err) {
    console.error("Groq API Error Details:");
    console.error(err);
  }
}
main();
