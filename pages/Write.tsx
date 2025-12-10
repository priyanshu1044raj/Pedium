import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import EditorComponent from '../components/EditorComponent';
import { uploadFile, databases, ID, DB_ID, CollectionIDs, getFollowers, base64ToFile } from '../lib/appwrite';
import { generateCoverImage, generateSummary, generateArticleContent, generateTags, generateImageFromPrompt } from '../lib/gemini';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { OutputData } from '@editorjs/editorjs';
import { ImagePlus, Loader2, Sparkles, X, ArrowLeft, Tag } from 'lucide-react';

const DRAFT_KEY = 'pedium_draft_v1';

const Write: React.FC = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [editorData, setEditorData] = useState<OutputData | undefined>(undefined);
    const [isPublishing, setIsPublishing] = useState(false);
    const [tags, setTags] = useState('');
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    
    // Editor State
    const [isEditorReady, setIsEditorReady] = useState(false);
    
    // AI Writer State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiWriting, setIsAiWriting] = useState(false);
    const [aiStatus, setAiStatus] = useState('Writing...');
    const [editorKey, setEditorKey] = useState(0);

    const [draftStatus, setDraftStatus] = useState<'Saved' | 'Saving...' | ''>('');

    // Load Draft on Mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                if (parsed.title) setTitle(parsed.title);
                if (parsed.tags) setTags(parsed.tags);
                if (parsed.content && parsed.content.blocks && parsed.content.blocks.length > 0) {
                    setEditorData(parsed.content);
                    setEditorKey(prev => prev + 1); 
                }
            } catch (e) {
                console.error("Failed to load draft", e);
            }
        }
    }, []);

    // Auto-Save Draft
    useEffect(() => {
        if (!title && !tags && (!editorData?.blocks || editorData.blocks.length === 0)) return;

        setDraftStatus('Saving...');
        const timeoutId = setTimeout(() => {
            const draft = {
                title,
                tags,
                content: editorData,
                timestamp: Date.now()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            setDraftStatus('Saved');
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [title, tags, editorData]);


    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const url = await uploadFile(e.target.files[0]);
                setCoverImage(url);
            } catch (error) {
                console.error(error);
                alert('Failed to upload cover image');
            }
        }
    };

    const getPlainText = (data: OutputData | undefined) => {
        if (!data || !data.blocks) return "";
        return data.blocks
            .filter(b => b.type === 'paragraph' || b.type === 'header')
            .map(b => b.data.text)
            .join(" ");
    };

    const handleAiGenerateCover = async () => {
        if (!title) {
            alert("Please enter a title first to generate a relevant cover.");
            return;
        }
        setIsGeneratingCover(true);
        try {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
            const context = getPlainText(editorData);

            const aiBase64 = await generateCoverImage(title, tagList, context);
            if (aiBase64) {
                const file = base64ToFile(aiBase64, 'ai_generated_cover.png');
                const url = await uploadFile(file);
                setCoverImage(url);
            } else {
                alert("Could not generate image. Please try again.");
            }
        } catch (e) {
            console.error("AI Generation failed", e);
            alert("AI Generation failed. Check console for details.");
        } finally {
            setIsGeneratingCover(false);
        }
    };

    const handleAiWriteArticle = async () => {
        if(!aiPrompt.trim()) return;
        setIsAiWriting(true);
        setAiStatus('Drafting content...');
        
        try {
            const generatedContent = await generateArticleContent(aiPrompt);
            
            if(generatedContent && generatedContent.blocks) {
                const processedBlocks = [];
                let imageCount = 0;

                for (const block of generatedContent.blocks) {
                    // 1. Clean Markdown stars
                    if (block.data && typeof block.data.text === 'string') {
                        block.data.text = block.data.text.replace(/\*\*/g, '').replace(/__/g, '');
                    }

                    // 2. Handle Image Suggestions
                    if (block.type === 'image_suggestion') {
                        imageCount++;
                        setAiStatus(`Generating image ${imageCount}...`);
                        try {
                            const b64 = await generateImageFromPrompt(block.data.prompt);
                            if (b64) {
                                const file = base64ToFile(b64, 'ai_content_image.png');
                                const url = await uploadFile(file);
                                
                                processedBlocks.push({
                                    type: 'image',
                                    data: {
                                        file: { url },
                                        caption: block.data.caption || '',
                                        withBorder: false,
                                        withBackground: false,
                                        stretched: false
                                    }
                                });
                                continue;
                            }
                        } catch (e) {
                            console.error("Failed inline image", e);
                            continue;
                        }
                    }
                    
                    processedBlocks.push(block);
                }

                generatedContent.blocks = processedBlocks;
                setEditorData(generatedContent);
                setEditorKey(prev => prev + 1); 
                if(!title) setTitle(aiPrompt);
                setShowAiModal(false);
            } else {
                alert("Failed to generate content. Try a different prompt.");
            }
        } catch (e) {
            console.error(e);
            alert("Error writing article.");
        } finally {
            setIsAiWriting(false);
            setAiStatus('Writing...');
        }
    }

    const handlePublish = async () => {
        if (!user || !profile) {
             alert("You must be logged in to publish.");
             return;
        }
        if(!title) {
            alert("Please add a title.");
            return;
        }
        if(!editorData || !editorData.blocks || editorData.blocks.length === 0) {
            alert("Please write some content before publishing.");
            return;
        }

        setIsPublishing(true);

        const plainText = getPlainText(editorData);
        let excerpt = plainText.replace(/<[^>]*>?/gm, '');
        excerpt = excerpt.substring(0, 150) + (excerpt.length > 150 ? '...' : '');

        let tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        let finalCoverImage = coverImage;
        let summary = "";

        try {
            if (tagList.length === 0) {
                try {
                    const generated = await generateTags(title, plainText);
                    if (generated && generated.length > 0) {
                        tagList = generated;
                    }
                } catch (e) {}
            }

            if (!finalCoverImage) {
                setIsGeneratingCover(true);
                try {
                    const aiBase64 = await generateCoverImage(title, tagList, plainText);
                    if (aiBase64) {
                        const file = base64ToFile(aiBase64, 'ai_auto_cover.png');
                        finalCoverImage = await uploadFile(file);
                    }
                } catch (e) {}
            }

            try {
                summary = await generateSummary(title, plainText);
            } catch (e) {
                summary = excerpt;
            }

            const articleData = {
                title,
                content: JSON.stringify(editorData),
                coverImage: finalCoverImage,
                authorId: user.$id,
                authorName: profile.name,
                authorAvatar: profile.avatarUrl,
                excerpt,
                summary,
                views: 0,
                likesCount: 0,
                tags: tagList
            };

            const newArticle = await databases.createDocument(
                DB_ID,
                CollectionIDs.ARTICLES,
                ID.unique(),
                articleData
            );

            // SEND NOTIFICATIONS
            try {
                const followers = await getFollowers(user.$id);
                // Create notifications for all followers
                if (followers.length > 0) {
                    await Promise.all(followers.map(f => 
                         databases.createDocument(DB_ID, CollectionIDs.NOTIFICATIONS, ID.unique(), {
                            userId: f.follower_id,
                            type: 'new_article',
                            message: `${profile.name} published: ${title}`,
                            link: `/article/${newArticle.$id}`,
                            isRead: false,
                            createdAt: new Date().toISOString()
                         })
                    ));
                }
            } catch (notifErr) {
                console.error("Failed to send notifications", notifErr);
            }

            localStorage.removeItem(DRAFT_KEY);
            navigate('/');

        } catch (error: any) {
             if (error.message && error.message.includes('Unknown attribute: "summary"')) {
                try {
                    const fallbackData = {
                        title,
                        content: JSON.stringify(editorData),
                        coverImage: finalCoverImage,
                        authorId: user.$id,
                        authorName: profile.name,
                        authorAvatar: profile.avatarUrl,
                        excerpt,
                        views: 0,
                        likesCount: 0,
                        tags: tagList
                    };
                    await databases.createDocument(DB_ID, CollectionIDs.ARTICLES, ID.unique(), fallbackData);
                    localStorage.removeItem(DRAFT_KEY);
                    navigate('/');
                    return;
                } catch (e) {}
            }
            alert(`Failed to publish: ${error.message}`);
        } finally {
            setIsPublishing(false);
            setIsGeneratingCover(false);
        }
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#121212] pb-32 transition-colors">
            <Navbar />
            
            <div className="sticky top-20 z-30 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 py-4 px-4 sm:px-8">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                            Draft <span className="mx-2">•</span> {user.name}
                        </span>
                        {draftStatus && (
                            <span className="text-xs text-gray-400">
                                {draftStatus}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                         <button
                            onClick={() => setShowAiModal(true)}
                            className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                            title="AI Assistant"
                        >
                            <Sparkles size={20} />
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={isPublishing || isGeneratingCover || !title}
                            className="bg-green-600 text-white px-5 py-1.5 rounded-full text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                            {isPublishing ? <Loader2 size={16} className="animate-spin" /> : 'Publish'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 mt-16">
                <div className="mb-12 group relative">
                    {coverImage ? (
                        <div className="relative h-[400px] w-full mb-8">
                             <img src={coverImage} alt="Cover" className="w-full h-full object-cover rounded-sm" />
                             <button 
                                onClick={() => setCoverImage(null)} 
                                className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 p-2 rounded-full text-red-500 shadow-sm hover:bg-white dark:hover:bg-black transition-all"
                             >
                                <X size={18} />
                             </button>
                        </div>
                    ) : (
                        <div className="flex gap-4 mb-8">
                             <label className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 hover:text-black dark:hover:text-white transition-colors">
                                <ImagePlus size={18} /> Add Cover
                                <input type="file" className="hidden" onChange={handleCoverUpload} accept="image/*" />
                            </label>
                            <button 
                                onClick={handleAiGenerateCover}
                                disabled={!title || isGeneratingCover}
                                className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                            >
                                {isGeneratingCover ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                {isGeneratingCover ? "Generating..." : "Generate Cover"}
                            </button>
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-5xl md:text-6xl font-serif font-bold w-full outline-none placeholder-gray-300 dark:placeholder-gray-600 text-black dark:text-white mb-6 bg-transparent leading-tight"
                    />
                    
                    <div className="flex items-center gap-2 text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <Tag size={16} />
                        <input
                            type="text"
                            placeholder="Add topics..."
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="text-base text-gray-600 dark:text-gray-300 w-full outline-none bg-transparent font-medium"
                        />
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {!isEditorReady && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-gray-300" size={24} />
                        </div>
                    )}
                    <EditorComponent 
                        key={editorKey}
                        holder="editorjs" 
                        data={editorData}
                        onChange={(data) => setEditorData(data)}
                        onReady={() => setIsEditorReady(true)}
                    />
                </div>
            </div>

            {/* AI Modal */}
            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-8 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif font-bold text-black dark:text-white">AI Writing Assistant</h3>
                            <button onClick={() => setShowAiModal(false)}><X size={20} className="text-gray-400 hover:text-black dark:hover:text-white"/></button>
                        </div>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Describe what you want to write about..."
                            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-[#2A2A2A] dark:text-white rounded-lg p-4 h-32 mb-6 focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none resize-none font-serif text-lg"
                        />
                        <button 
                            onClick={handleAiWriteArticle}
                            disabled={isAiWriting || !aiPrompt.trim()}
                            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isAiWriting ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                            {isAiWriting ? aiStatus : "Generate Draft"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Write;