const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY; // Reusing the same key if valid for NLP

export interface NlpEntity {
  name: string;
  type: string;
  metadata: Record<string, string>;
  salience: number;
  mentions: Array<{
    text: { content: string; beginOffset: number };
    type: string;
  }>;
}

export interface NlpAnalysisResponse {
  entities: NlpEntity[];
  language: string;
}

/**
 * Calls Google Cloud Natural Language API to analyze entities (identifying medical terms, symptoms, etc.)
 */
export async function analyzeEntities(text: string): Promise<NlpAnalysisResponse> {
  if (!GOOGLE_API_KEY) {
    throw new Error("VITE_GOOGLE_TRANSLATE_API_KEY is not defined");
  }

  const url = `https://language.googleapis.com/v1/documents:analyzeEntities?key=${GOOGLE_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document: {
        type: 'PLAIN_TEXT',
        content: text,
      },
      encodingType: 'UTF8',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to analyze entities");
  }

  return response.json();
}

/**
 * Calls Google Cloud Natural Language API to analyze sentiment
 */
export async function analyzeSentiment(text: string) {
  if (!GOOGLE_API_KEY) {
    throw new Error("VITE_GOOGLE_TRANSLATE_API_KEY is not defined");
  }

  const url = `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${GOOGLE_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document: {
        type: 'PLAIN_TEXT',
        content: text,
      },
      encodingType: 'UTF8',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to analyze sentiment");
  }

  return response.json();
}
