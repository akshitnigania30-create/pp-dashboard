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

  const apiKey = Netlify.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const messages = body.messages || [];
    const systemPrompt = body.system || "";

    const textParts = [];

    if (systemPrompt) textParts.push(systemPrompt);

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

    const openRouterBody = {
     model: "openrouter/free",
      messages: [
        {
          role: "user",
          content: textParts.join("\n\n")
        }
      ],
      temperature: 0.1
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(openRouterBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
