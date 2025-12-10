import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper: Generate Image from Prompt using gemini-2.5-flash-image
export const generateImageFromPrompt = async (prompt: string, aspectRatio: string = "1:1"): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: { aspectRatio: aspectRatio }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64Data = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
                return `data:${mimeType};base64,${base64Data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Gemini Image Generation Failed:", error);
        return null;
    }
};

export const generateAvatar = async (username: string): Promise<string | null> => {
    // Simplified prompt for reliable avatar generation
    const prompt = `cute colorful flat vector avatar icon for user ${username}, minimal style, white background, circular`;
    return await generateImageFromPrompt(prompt, "1:1");
};

export const generateCoverImage = async (title: string, tags: string[] = [], context: string = ''): Promise<string | null> => {
    const tagString = tags.length > 0 ? `Tags: ${tags.join(', ')}.` : '';
    const contextString = context ? `Context: ${context.substring(0, 200)}...` : '';
    
    // Prompt for high-quality blog cover
    const prompt = `high quality editorial illustration for blog post titled "${title}". ${tagString} ${contextString} modern, minimal, flat design, artistic, no text`;

    // Ensure 16:9 aspect ratio for covers
    return await generateImageFromPrompt(prompt, "16:9");
};

export const generateSummary = async (title: string, content: string): Promise<string> => {
    try {
        const prompt = `Summarize this article in 1 short sentence (max 30 words). Title: ${title}. Content: ${content.substring(0, 1000)}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Read this amazing story on Pedium.";
    } catch (error) {
        console.error("Summary generation failed", error);
        return "Read this amazing story on Pedium.";
    }
};

export const generateArticleContent = async (topic: string): Promise<any> => {
    try {
        const prompt = `Write a comprehensive blog post about "${topic}".
        Return strict JSON for Editor.js blocks.
        
        Rules:
        1. NO Markdown formatting (no **bold**, no *italic*, no # headers) in text fields. Pure text only.
        2. Include 6-10 blocks.
        3. Use a mix of: 'header' (level 2), 'paragraph', 'list', 'quote', 'warning', 'delimiter', 'code'.
        4. Include 1 or 2 'image_suggestion' blocks where an image would enhance the article.
           Format for image suggestion: { "type": "image_suggestion", "data": { "prompt": "Detailed visual description of image needed", "caption": "Image caption" } }
        
        Structure:
        {
            "blocks": [ ... ]
        }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text || "{}";
        return JSON.parse(text);
    } catch (error) {
        console.error("Article generation failed", error);
        return null;
    }
};

export const generateTags = async (title: string, content: string): Promise<string[]> => {
    try {
        const prompt = `Generate 3-5 comma-separated tags for article "${title}". First tag must be one of: Programming, AI, Design, Psychology, Money, Business.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text || "";
        return text.split(',').map(t => t.trim()).slice(0, 5);
    } catch (error) {
        return [];
    }
};