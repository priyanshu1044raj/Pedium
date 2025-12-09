import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAvatar = async (username: string): Promise<string | null> => {
    try {
        const prompt = `Create a cute, vibrant, 2D flat vector art avatar for a user named "${username}". The character should be friendly, colorful, and styled like a modern cartoon or illustration. Use soft pastel colors for the background. Ensure the image is circular-ready and centered.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
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
        console.error("Gemini Avatar Generation Failed:", error);
        return null;
    }
};

export const generateCoverImage = async (title: string, tags: string[] = [], context: string = ''): Promise<string | null> => {
    try {
        const tagString = tags.length > 0 ? `Tags: ${tags.join(', ')}.` : '';
        const contextString = context ? `Article Context: ${context.substring(0, 300)}...` : '';
        
        // Updated prompt for Semantic, Editorial-style images
        const prompt = `Create a high-quality, professional editorial illustration for a blog post titled "${title}". 
        ${tagString}
        ${contextString}
        
        Instructions:
        1. Analyze the title and context to understand the subject matter.
        2. Create a visual metaphor or scene that clearly represents this subject.
        3. Style: Modern digital illustration, clean lines, professional color palette (avoid excessive neon/fluorescent colors unless appropriate for the topic).
        4. No text inside the image.
        5. Aspect Ratio: 16:9 (Landscape).`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
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
        console.error("Gemini Cover Generation Failed:", error);
        return null;
    }
};

export const generateSummary = async (title: string, content: string): Promise<string> => {
    try {
        const prompt = `Read the following article title and content. Generate a short, intriguing, and catchy 2-sentence summary (approx 30 words) that makes a user want to click. Title: ${title}. Content: ${content.substring(0, 1000)}...`;
        
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
        const prompt = `Write a comprehensive, engaging blog post about "${topic}". 
        Return the response strictly as a JSON object compatible with Editor.js "blocks" array format. 
        
        The JSON should look like this structure:
        {
            "blocks": [
                { "type": "header", "data": { "text": "Catchy Subheading", "level": 2 } },
                { "type": "paragraph", "data": { "text": "Engaging introduction text..." } },
                { "type": "list", "data": { "style": "unordered", "items": ["point 1", "point 2"] } },
                { "type": "header", "data": { "text": "Another Section", "level": 2 } },
                { "type": "paragraph", "data": { "text": "Detailed explanation..." } }
            ]
        }
        
        Include at least 5-7 blocks. Do not include markdown formatting like \`\`\`json. Just return the JSON object.`;

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
        const prompt = `Analyze the following article title and content. Generate 3 to 5 relevant, single-word or two-word tags (lowercase). Return ONLY the tags separated by commas. 
        Title: ${title}
        Content Snippet: ${content.substring(0, 500)}...`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text || "";
        // Clean up text and split
        const tags = text.split(',')
            .map(t => t.trim().toLowerCase().replace(/[^a-z0-9 ]/g, ''))
            .filter(t => t.length > 0 && t.length < 20)
            .slice(0, 5);
            
        return tags;
    } catch (error) {
        console.error("Tag generation failed", error);
        return [];
    }
};