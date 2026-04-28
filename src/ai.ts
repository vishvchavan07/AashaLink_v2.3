import { GoogleGenerativeAI } from "@google/generative-ai";

const getModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

export const transcribeAudioWithGemini = async (audioBlob: Blob, language: string, apiKey: string): Promise<string> => {
  try {
    const model = getModel(apiKey);
    
    // Convert blob to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(audioBlob);
    });
    
    const base64Data = await base64Promise;
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: audioBlob.type || "audio/webm"
        }
      },
      { text: `Transcribe this audio accurately in ${language}. Provide only the transcription text.` }
    ]);
    
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini Transcription failed:", error);
    throw error;
  }
};

export const translateTextWithGemini = async (text: string, targetLanguage: string, apiKey: string): Promise<string> => {
  try {
    const model = getModel(apiKey);
    const prompt = `Translate the following text to ${targetLanguage}. Provide ONLY the translated text.\n\nText: "${text}"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini Translation failed:", error);
    throw error;
  }
};

export const analyzeEntitiesWithGemini = async (text: string, apiKey: string): Promise<{ entities: { name: string }[] }> => {
  try {
    const model = getModel(apiKey);
    const prompt = `Extract 3-4 key medical or health-related entities (keywords) from this text. 
    Return them as a JSON object with an "entities" array of objects, each having a "name" key.
    Example: {"entities": [{"name": "Fever"}, {"name": "Paracetamol"}]}
    Text: "${text}"`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { entities: [] };
  } catch (error) {
    console.error("Gemini Entity Analysis failed:", error);
    return { entities: [] };
  }
};
