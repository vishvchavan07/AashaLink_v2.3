export const translateTextGoogleCloudV3 = async (
  text: string,
  targetLanguage: string,
  projectId: string,
  apiKey: string,
  sourceLanguage?: string
): Promise<string> => {
  try {
    // Using v3beta1 endpoint as per user discovery document
    const url = `https://translation.googleapis.com/v3beta1/projects/${projectId}:translateText?key=${apiKey}`;
    
    const requestBody = {
      contents: [text],
      targetLanguageCode: targetLanguage,
      sourceLanguageCode: sourceLanguage,
      mimeType: "text/plain"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Google Cloud Translation API failed');
    }

    const data = await response.json();
    
    if (data.translations && data.translations.length > 0) {
      return data.translations[0].translatedText;
    }
    
    return text;
  } catch (error) {
    console.error('Translation Error:', error);
    return text; // Fallback to original text
  }
};
