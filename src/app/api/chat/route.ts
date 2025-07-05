import { NextRequest, NextResponse } from "next/server";
import { Mistral } from "@mistralai/mistralai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, options = {} } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const model = options.model || "mistral-small-latest";
    let answer = "";
    let sources: any[] = [];

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 2 seconds')), 2000);
    });

    if (model.includes("groq") || model.includes("llama")) {
      const groqAPICall = fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
          }),
        }
      );

      const groqResponse = await Promise.race([groqAPICall, timeoutPromise]) as Response;

      if (!groqResponse.ok) {
        throw new Error(`Groq API error: ${groqResponse.status}`);
      }

      const groqData = await groqResponse.json();
      answer = groqData.choices[0].message.content;
    } else {
      const mistralClient = new Mistral({
        apiKey: process.env.MISTRAL_API_KEY,
      });
      
      const mistralAPICall = mistralClient.chat.complete({
        model: model,
        messages: messages,
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      });

      const mistralResponse = await Promise.race([mistralAPICall, timeoutPromise]) as any;

      const content = mistralResponse.choices[0]?.message?.content;
      if (Array.isArray(content)) {
        answer = content
          .map((chunk) => {
            if (chunk.type === "text") {
              return chunk.text || "";
            }
            return "";
          })
          .join("");
      } else {
        answer = content || "";
      }
    }

    return NextResponse.json({
      answer: answer,
      sources: sources,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
