import React, { useState } from 'react';
import { databases, DB_ID, CollectionIDs, ID, uploadFile } from '../lib/appwrite';
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
            title: "The Future of Web Development: Beyond React",
            tags: ["coding", "technology"],
            blocks: [
                { type: "header", data: { text: "The Paradigm Shift", level: 2 } },
                { type: "paragraph", data: { text: "As we move into 2024, the landscape of web development is shifting beneath our feet. While React remains dominant, new contenders like SolidJS and Svelte are challenging the virtual DOM model." } },
                { type: "quote", data: { text: "Simplicity is the ultimate sophistication.", caption: "Leonardo da Vinci" } },
                { type: "paragraph", data: { text: "Consider the following component structure in a signal-based framework:" } },
                { type: "code", data: { code: "const Count = () => {\n  const [count, setCount] = createSignal(0);\n  return <button onClick={() => setCount(c => c + 1)}>{count()}</button>;\n}" } },
                { type: "paragraph", data: { text: "This granular reactivity model offers significant performance benefits over the traditional top-down reconciliation process." } }
            ]
        },
        {
            title: "Mastering Python for Data Science",
            tags: ["coding", "python", "data"],
            blocks: [
                { type: "header", data: { text: "Why Python Wins", level: 2 } },
                { type: "paragraph", data: { text: "Python's ecosystem for data analysis is unmatched. Libraries like Pandas, NumPy, and Scikit-learn provide a robust foundation for any data scientist." } },
                { type: "list", data: { style: "unordered", items: ["Easy to learn syntax", "Massive community support", "Integration with Big Data tools"] } },
                { type: "paragraph", data: { text: "Here is a simple example of data manipulation using Pandas:" } },
                { type: "code", data: { code: "import pandas as pd\n\ndf = pd.read_csv('data.csv')\nprint(df.describe())" } },
                { type: "delimiter", data: {} },
                { type: "paragraph", data: { text: "Start your journey today by installing Anaconda or setting up a Jupyter Notebook environment." } }
            ]
        },
        {
            title: "Global Summit: Tech Giants Announce AI Coalition",
            tags: ["news", "ai"],
            blocks: [
                { type: "header", data: { text: "A Unified Front for AI Safety", level: 2 } },
                { type: "paragraph", data: { text: "In a historic move, leaders from top technology firms gathered in Geneva today to announce the formation of the Global AI Safety Coalition. The goal is to establish universal standards for ethical AI development." } },
                { type: "quote", data: { text: "This is not just about regulation; it's about the survival of human creativity.", caption: "Summit Keynote Speaker" } },
                { type: "paragraph", data: { text: "The agreement covers three main pillars: Transparency, Accountability, and Bias Mitigation. Critics argue that self-regulation may not be enough, but the market reacted positively with tech stocks rising 3%." } }
            ]
        },
        {
            title: "SpaceX Starship: The Road to Mars",
            tags: ["news", "space"],
            blocks: [
                { type: "paragraph", data: { text: "The latest iteration of Starship has successfully completed its static fire test, paving the way for the next orbital flight attempt. Elon Musk states that reliability is the primary focus for this launch window." } },
                { type: "header", data: { text: "Engineering Marvels", level: 2 } },
                { type: "paragraph", data: { text: "The Raptor engines used in the Super Heavy booster are the most efficient methalox engines ever produced. The sheer thrust generated at liftoff is double that of the Saturn V rocket." } },
                { type: "list", data: { style: "ordered", items: ["33 Raptor Engines", "Stainless Steel Construction", "Full Reusability"] } },
                { type: "paragraph", data: { text: "Humanity is one step closer to becoming a multi-planetary species." } }
            ]
        },
        {
            title: "Welcome to Pedium: The Art of Storytelling",
            tags: ["pedium", "writing"],
            blocks: [
                { type: "header", data: { text: "Share Your Voice", level: 1 } },
                { type: "paragraph", data: { text: "Pedium is more than just a blogging platform; it's a canvas for your thoughts. With our sleek, distraction-free editor, you can focus on what matters most: your words." } },
                { type: "checklist", data: { items: [ { text: "Create an account", checked: true }, { text: "Customize your profile", checked: true }, { text: "Write your first masterpiece", checked: false } ] } },
                { type: "paragraph", data: { text: "We believe in the power of community. Engage with other writers, follow your favorites, and build your audience. Welcome home." } }
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
                
                // 1. Generate Cover
                let coverUrl = null;
                try {
                    const b64 = await generateCoverImage(article.title, article.tags);
                    if (b64) {
                        const res = await fetch(b64);
                        const blob = await res.blob();
                        const file = new File([blob], 'seed_cover.png', { type: 'image/png' });
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
                        content: JSON.stringify({ time: Date.now(), blocks: article.blocks, version: "2.28.2" }),
                        coverImage: coverUrl,
                        authorId: user.$id,
                        authorName: profile.name,
                        authorAvatar: profile.avatarUrl,
                        excerpt: plainText.substring(0, 150) + "...",
                        summary: summary,
                        views: Math.floor(Math.random() * 500) + 50, // Random views for trending
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
                        This tool will automatically generate and publish 5 high-quality articles (Coding, News, Pedium) to your database using your current user profile as the author. It includes generating vibrant AI cover images and summaries.
                    </p>
                    
                    <button 
                        onClick={generate} 
                        disabled={isSeeding}
                        className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold hover:bg-brand-secondary disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-primary/20"
                    >
                        {isSeeding ? <><Loader2 className="animate-spin" /> Generating Content...</> : "Generate 5 Articles"}
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