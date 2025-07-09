import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "MISTRAL_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const client = new Mistral({apiKey: apiKey});
        const response = await client.chat.complete({
          model: 'mistral-medium-2505',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        });
        
        if (response) {
          const generatedText = response.choices[0].message.content;
          
          if (!generatedText) {
            return NextResponse.json(
              { error: 'No response from Gemini API' },
              { status: 500 }
            );
          }

          return NextResponse.json({
            result: generatedText,
            success: true,
          });
        }

        break;

      } catch (fetchError) {
        console.error(`Attempt ${attempt} failed:`, fetchError);
        lastError = { error: fetchError instanceof Error ? fetchError.message : 'Network error' };
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
      }
    }
  } catch (error) {
    console.error('LLM Evaluation route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 