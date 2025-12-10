import React, { useState } from 'react';
import { databases, DB_ID, CollectionIDs, ID, uploadFile, base64ToFile } from '../lib/appwrite';
import { generateCoverImage, generateSummary } from '../lib/gemini';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';

const Seed: React.FC = () => {
    const { user, profile } = useAuth();
    const [status, setStatus] = useState<string[]>([]);
    const [isSeeding, setIsSeeding] = useState(false);

    const log = (msg: string) => setStatus(prev => [...prev, msg]);

    const articlesToGenerate = [
        {
            title: "The Ultimate Guide to React Performance in 2024",
            tags: ["coding", "react"],
            blocks: [
                { type: "paragraph", data: { text: "Performance is no longer optional. In 2024, web vitals directly impact your search ranking and user retention. Let's dive deep into optimizing React applications." } },
                { type: "header", data: { text: "1. Understanding Re-renders", level: 2 } },
                { type: "warning", data: { title: "Pro Tip", message: "Use the React DevTools Profiler to visualize component updates." } },
                { type: "paragraph", data: { text: "The most common performance killer is unnecessary re-renders. Here is a pattern to avoid:" } },
                { type: "code", data: { code: "// Bad Practice\nconst Component = () => {\n  const [data, setData] = useState({});\n  const handleClick = () => { /* ... */ };\n  // handleClick is redefined on every render!\n  return <Child onClick={handleClick} />;\n}" } },
                { type: "paragraph", data: { text: "Instead, wrap stable functions in `useCallback`." } },
                { type: "table", data: { withHeadings: true, content: [["Metric", "Target", "Impact"], ["LCP", "< 2.5s", "High"], ["FID", "< 100ms", "High"], ["CLS", "< 0.1", "Medium"]] } },
                { type: "image", data: { file: { url: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=1600&q=80" }, caption: "Code optimization is an art." } }
            ]
        },
        {
            title: "Why Minimalist Design is Taking Over Tech",
            tags: ["design", "ui"],
            blocks: [
                { type: "header", data: { text: "Less is More", level: 2 } },
                { type: "quote", data: { text: "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.", caption: "Antoine de Saint-Exupéry" } },
                { type: "paragraph", data: { text: "We are seeing a shift away from complex, skeuomorphic interfaces towards clean, flat, and typography-driven designs." } },
                { type: "list", data: { style: "unordered", items: ["Focus on content", "Faster load times", "Better accessibility"] } },
                { type: "image", data: { file: { url: "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?auto=format&fit=crop&w=1600&q=80" }, caption: "Clean lines define modern aesthetics." } },
                { type: "paragraph", data: { text: "Apple's recent iOS updates confirm this trend, utilizing large headers and negative space effectively." } }
            ]
        },
        {
            title: "Top 5 Investment Strategies for the Next Decade",
            tags: ["money", "business"],
            blocks: [
                { type: "paragraph", data: { text: "The global economy is changing. Traditional 60/40 portfolios are being challenged by new asset classes." } },
                { type: "checklist", data: { items: [ { text: "Diversify into emerging markets", checked: true }, { text: "Consider Green Energy ETFs", checked: true }, { text: "Ignore cryptocurrency volatility", checked: false } ] } },
                { type: "header", data: { text: "The Rise of AI Investing", level: 2 } },
                { type: "paragraph", data: { text: "Algorithmic trading is now accessible to retail investors. However, caution is advised." } },
                { type: "warning", data: { title: "Risk Alert", message: "Past performance does not guarantee future results. Always consult a financial advisor." } },
                { type: "image", data: { file: { url: "https://images.unsplash.com/photo-1611974765270-ca1258822981?auto=format&fit=crop&w=1600&q=80" }, caption: "Market trends analysis." } }
            ]
        },
        {
            title: "The Neurochemistry of Focus",
            tags: ["psychology", "health"],
            blocks: [
                { type: "header", data: { text: "Dopamine and Distraction", level: 2 } },
                { type: "paragraph", data: { text: "Our brains are hardwired to seek novelty. Social media exploits this vulnerability, creating a feedback loop that destroys attention spans." } },
                { type: "delimiter", data: {} },
                { type: "paragraph", data: { text: "To combat this, we must practice 'Deep Work'. This involves scheduling blocks of uninterrupted time." } },
                { type: "image", data: { file: { url: "https://images.unsplash.com/photo-1517971071642-34a2d3ecc6c3?auto=format&fit=crop&w=1600&q=80" }, caption: "A quiet space is essential for deep focus." } },
                { type: "quote", data: { text: "The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable.", caption: "Cal Newport" } }
            ]
        }
    ];

    const generate = async () => {
        if (!user || !profile) {
            alert("Please login first");
            return;
        }
        setIsSeeding(true);
        setStatus([]);

        try {
            for (const article of articlesToGenerate) {
                log(`Generating cover for: ${article.title}...`);
                
                // 1. Generate Cover using AI
                let coverUrl = null;
                try {
                    const b64 = await generateCoverImage(article.title, article.tags);
                    if (b64) {
                        const file = base64ToFile(b64, 'seed_cover.png');
                        coverUrl = await uploadFile(file);
                    }
                } catch (e) {
                    log(`Failed to generate cover for ${article.title}`);
                }

                // 2. Generate Summary
                const plainText = article.blocks.map(b => b.data.text || "").join(" ");
                const summary = await generateSummary(article.title, plainText);

                // 3. Create Document
                await databases.createDocument(
                    DB_ID,
                    CollectionIDs.ARTICLES,
                    ID.unique(),
                    {
                        title: article.title,
                        content: JSON.stringify({ time: Date.now(), blocks: article.blocks, version: "2.29.1" }),
                        coverImage: coverUrl,
                        authorId: user.$id,
                        authorName: profile.name,
                        authorAvatar: profile.avatarUrl,
                        excerpt: plainText.substring(0, 150) + "...",
                        summary: summary,
                        views: Math.floor(Math.random() * 500) + 50, 
                        likesCount: Math.floor(Math.random() * 50),
                        tags: article.tags
                    }
                );
                log(`Published: ${article.title}`);
            }
            log("Done! You can now return to the homepage.");
        } catch (e) {
            console.error(e);
            log("Error occurred during seeding.");
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-light">
            <Navbar />
            <div className="max-w-2xl mx-auto py-20 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                    <h1 className="text-3xl font-display font-bold mb-6">Seed Content Generator</h1>
                    <p className="text-gray-600 mb-8">
                        This tool will automatically generate and publish 4 rich, high-quality articles with Tables, Code, Quotes, and Images to your database using your current user profile.
                    </p>
                    
                    <button 
                        onClick={generate} 
                        disabled={isSeeding}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                        {isSeeding ? <><Loader2 className="animate-spin" /> Generating Content...</> : "Generate 4 Rich Articles"}
                    </button>

                    <div className="mt-8 space-y-3">
                        {status.map((msg, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                                <CheckCircle size={16} className="text-green-500" /> {msg}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Seed;