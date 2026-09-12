import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

/**
 * Mints a short-lived ephemeral token so the browser can open a Gemini Live
 * WebSocket directly without ever seeing the real API key.
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY is not configured. Add it to .env.local (see .env.example) or your Vercel project settings.",
      },
      { status: 500 },
    );
  }

  try {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      },
    });

    return NextResponse.json({
      token: token.name,
      model: process.env.GEMINI_LIVE_MODEL || DEFAULT_MODEL,
    });
  } catch (err) {
    console.error("Failed to mint ephemeral token", err);
    return NextResponse.json(
      { error: "Could not create a session token. Check the server logs and your GEMINI_API_KEY." },
      { status: 500 },
    );
  }
}
