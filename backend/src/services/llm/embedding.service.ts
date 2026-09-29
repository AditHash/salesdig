import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenAI({ apiKey });
};

// Embed a document (report digest) for indexing
export const embedDocument = async (text: string): Promise<number[]> => {
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: 768 }
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("No embedding returned from Gemini");
  return values;
};

// Embed a user query for search
export const embedQuery = async (text: string): Promise<number[]> => {
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: 768 }
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("No embedding returned from Gemini");
  return values;
};
