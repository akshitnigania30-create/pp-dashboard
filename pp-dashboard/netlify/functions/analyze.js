export default async (request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST request" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const apiKey = Netlify.env.get("GROQ_API_KEY");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();

    const messages = body.messages || [];
    const systemPrompt = body.system || "";

    const textParts = [];

    if (systemPrompt) {
      textParts.push(systemPrompt);
    }

    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "text" && block.text) {
            textParts.push(block.text);
          }
        }
      } else if (msg.content) {
        textParts.push(msg.content);
      }
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
       body: JSON.stringify({
  model: "llama-3.3-70b-versatile",
  messages: [
    {
      role: "user",
      content:
        textParts.join("\n\n") +
        "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no headings, no extra text."
    }
  ],
  temperature: 0.1
})
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const text =
      data.choices?.[0]?.message?.content || "No response generated";

    return new Response(
      JSON.stringify({
        content: [
          {
            type: "text",
            text
          }
        ]
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
};
