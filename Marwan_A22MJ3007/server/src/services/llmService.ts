export const generateStructuredKB = async (rawText: string) => {
  try {
  
    let trimmedText = rawText;

    // keep model stable + avoid timeout
    const MAX_LENGTH = 1200;

    if (trimmedText.length > MAX_LENGTH) {
      trimmedText = trimmedText.slice(0, MAX_LENGTH);
    }

    console.log("🧠 Sending request to Phi3...");
    console.log("📄 Input length:", trimmedText.length);

  
    const prompt = `
You are a DHL internal logistics documentation system.

Convert the text into a structured knowledge base article.

RULES:
- Output ONLY valid JSON
- No markdown
- No \`\`\`
- No explanations
- NEVER mention AI, ChatGPT, or generation

Return exactly:

{
  "title": "",
  "summary": "",
  "steps": [],
  "roles": [],
  "keyPoints": [],
  "risks": [],
  "notes": ""
}

STYLE:
- title: professional operational incident title
- summary: 1–3 lines clear explanation
- steps: actionable steps only
- roles: job roles involved
- keyPoints: important facts
- risks: operational risks
- notes: optional

TEXT:
${trimmedText}
`;


    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 120000); // ⬅ reduced from 10min → 2min safer for demo

  

    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "phi3",
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 200, // ⬅ reduced for stability
          top_k: 20,
          top_p: 0.8,
        },
      }),
    });

    clearTimeout(timeout);

    const data = await response.json();

    console.log("📦 RAW RESPONSE RECEIVED");

    if (!data?.response) {
      throw new Error("Empty response from model");
    }

 
    let cleaned = data.response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/^\s*json\s*/i, "")
      .trim();

    console.log("📄 CLEANED RESPONSE:", cleaned);

    
    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.log("⚠️ JSON PARSE FAILED - USING FALLBACK");

      return {
        title: "Operational Incident Report",
        summary: cleaned || "No summary available",
        steps: [],
        roles: [],
        keyPoints: [],
        risks: [],
        notes: "Model returned invalid JSON",
      };
    }

 
    return {
      title:
        (parsed.title || "Operational Incident Report")
          .replace(/AI|generated|chatgpt/gi, "")
          .trim(),

      summary: parsed.summary || "",

      steps: Array.isArray(parsed.steps) ? parsed.steps : [],

      roles: Array.isArray(parsed.roles) ? parsed.roles : [],

      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints
        : [],

      risks: Array.isArray(parsed.risks)
        ? parsed.risks
        : [],

      notes: parsed.notes || "",
    };
  } catch (error) {
    console.log("❌ LLM ERROR:", error);

    return {
      title: "Operational Incident Report",
      summary: rawText?.slice(0, 300) || "",
      steps: [],
      roles: [],
      keyPoints: [],
      risks: [],
      notes: "Fallback mode used due to system error",
    };
  }
};