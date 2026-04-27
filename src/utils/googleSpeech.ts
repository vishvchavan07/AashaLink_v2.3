export const transcribeAudioGoogleCloudV2 = async (
  audioBlob: Blob, 
  languageCode: string, 
  projectId: string, 
  apiKey: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // As per v2 documentation and discovery payload
        const url = `https://speech.googleapis.com/v2/projects/${projectId}/locations/global/recognizers/_:recognize?key=${apiKey}`;
        
        const requestBody = {
          config: {
            autoDecodingConfig: {},
            languageCodes: [languageCode],
            model: "latest_short"
          },
          content: base64Audio
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || 'Google Cloud Speech API failed');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const transcript = data.results
            .map((res: any) => res.alternatives?.[0]?.transcript || '')
            .join(' ');
          resolve(transcript);
        } else {
          resolve('');
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
  });
};
