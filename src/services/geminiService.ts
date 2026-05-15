import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getMarketInsight = async (marketData: any) => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `As a Senior Crypto Analyst, analyze this market data: ${JSON.stringify(marketData)}. 
    Provide a concise, 2-sentence insight about the current market sentiment and what a user should watch for. 
    Keep it professional and data-driven.`;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate market insights at this time. Please check your API configuration.";
  }
};

export const explainTransaction = async (txData: any) => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `Explain this blockchain transaction to a non-technical user: ${JSON.stringify(txData)}. 
    Focus on the flow of funds and the 'Transparency Ledger' context. Max 3 sentences.`;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Transaction analysis unavailable.";
  }
};
