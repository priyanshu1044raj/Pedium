import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { databases, DB_ID, CollectionIDs, Query, ID, getProfile } from '../lib/appwrite';
import { Article as ArticleType, Comment, UserProfile } from '../types';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, Share2, BookmarkPlus, PlayCircle, StopCircle, Eye, Check, AlertTriangle } from 'lucide-react';
import { toggleFollow, checkIsFollowing } from '../lib/appwrite';

const BlockRenderer: React.FC<{ block: any }> = ({ block }) => {
    switch (block.type) {
        case 'header':
            const Tag = `h${block.data.level}` as React.ElementType;
            const sizes = {
                1: 'text-3xl md:text-4xl leading-[1.2] font-bold', 
                2: 'text-2xl md:text-3xl leading-[1.3] font-bold', 
                3: 'text-xl md:text-2xl font-bold',  
                4: 'text-lg md:text-xl font-bold',   
            };
            return <Tag className={`font-sans mt-12 mb-6 text-[#242424] dark:text-[#f0f0f0] tracking-tight ${sizes[block.data.level as keyof typeof sizes] || 'text-xl'}`} dangerouslySetInnerHTML={{ __html: block.data.text }} />;
        case 'paragraph':
            return <p className="mb-6 font-serif text-[20px] md:text-[21px] leading-[1.8] text-[#292929] dark:text-[#d1d1d1] font-light antialiased tracking-[-0.003em]" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
        case 'image':
            return (
                <figure className="my-12 w-full">
                    <img src={block.data.file.url} alt={block.data.caption} className="w-full h-auto rounded-lg shadow-sm" />
                    {block.data.caption && <figcaption className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 font-sans">{block.data.caption}</figcaption>}
                </figure>
            );
        case 'list':
            return (
                <ul className={`my-8 ml-6 space-y-3 font-serif text-[20px] md:text-[21px] text-[#292929] dark:text-[#d1d1d1] leading-[1.8] ${block.data.style === 'ordered' ? 'list-decimal' : 'list-disc'}`}>
                    {block.data.items.map((item: string, i: number) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: item }} className="pl-2" />
                    ))}
                </ul>
            );
        case 'checklist':
            return (
                <div className="my-8 space-y-3 font-serif text-[20px] text-[#292929] dark:text-[#d1d1d1]">
                    {block.data.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className={`mt-1.5 w-5 h-5 border-2 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${item.checked ? 'bg-green-600 border-green-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                {item.checked && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className={item.checked ? 'line-through text-gray-400' : ''} dangerouslySetInnerHTML={{ __html: item.text }} />
                        </div>
                    ))}
                </div>
            );
        case 'quote':
            return (
                <blockquote className="border-l-[4px] border-black dark:border-gray-500 pl-6 my-12 italic font-serif text-[24px] md:text-[26px] text-[#242424] dark:text-[#e0e0e0] leading-tight">
                    "{block.data.text}"
                    {block.data.caption && <cite className="block text-base not-italic mt-4 text-gray-500 dark:text-gray-400 font-sans">— {block.data.caption}</cite>}
                </blockquote>
            );
        case 'warning':
            return (
                <div className="my-10 p-6 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-500 rounded-r-lg">
                    <div className="font-bold text-yellow-800 dark:text-yellow-500 mb-2 font-sans flex items-center gap-2 text-lg">
                        <AlertTriangle size={20} /> {block.data.title || "Note"}
                    </div>
                    <div className="text-yellow-800 dark:text-yellow-200 font-serif text-lg" dangerouslySetInnerHTML={{ __html: block.data.message }} />
                </div>
            );
        case 'table':
            return (
                <div className="my-12 overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-left border-collapse font-serif text-lg min-w-[600px]">
                        <tbody>
                            {block.data.content.map((row: string[], i: number) => (
                                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    {row.map((cell, j) => {
                                        const Tag = (block.data.withHeadings && i === 0) ? 'th' : 'td';
                                        return (
                                            <Tag key={j} className={`p-4 align-top ${Tag === 'th' ? 'font-sans font-bold bg-gray-50 dark:bg-gray-900 text-sm uppercase tracking-wide text-gray-500' : 'text-[#292929] dark:text-[#d1d1d1]'}`} dangerouslySetInnerHTML={{ __html: cell }} />
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        case 'delimiter':
            return <div className="flex justify-center text-3xl my-16 tracking-[0.5em] text-gray-300 dark:text-gray-600">...</div>;
        case 'code':
             return (
                 <pre className="bg-[#f9f9f9] dark:bg-[#1e1e1e] p-6 rounded-lg my-10 overflow-x-auto font-mono text-sm text-black dark:text-gray-200 border border-gray-100 dark:border-gray-800">
                     <code>{block.data.code}</code>
                 </pre>
             );
        case 'raw':
             return <div className="my-10" dangerouslySetInnerHTML={{ __html: block.data.html }} />;
        case 'embed':
             return (
                <div className="my-12">
                    <div className="w-full relative pt-[56.25%] bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
                         <iframe 
                            src={block.data.embed} 
                            className="absolute inset-0 w-full h-full"
                            frameBorder="0"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                         ></iframe>
                    </div>
                    {block.data.caption && <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 font-sans">{block.data.caption}</div>}
                </div>
             );
        default:
            return null;
    }
};

const Article: React.FC = () => {
    const { id } = useParams();
    const { user, profile, refreshProfile } = useAuth();
    const [article, setArticle] = useState<ArticleType | null>(null);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [liked, setLiked] = useState(false);
    const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    
    // TTS State
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    // UI State
    const [heroVisible, setHeroVisible] = useState(true);

    const fetchArticle = async () => {
        if (!id) return;
        try {
            const doc = await databases.getDocument(DB_ID, CollectionIDs.ARTICLES, id);
            setArticle(doc as unknown as ArticleType);
            const content = JSON.parse(doc.content);
            setBlocks(content.blocks);
            
            // View Increment Logic
            const storageKey = `viewed_article_${id}`;
            if (!localStorage.getItem(storageKey)) {
                setArticle(prev => prev ? {...prev, views: (prev.views || 0) + 1} : null);
                
                databases.updateDocument(DB_ID, CollectionIDs.ARTICLES, id, {
                    views: (doc.views || 0) + 1
                }).catch(console.error);
                localStorage.setItem(storageKey, 'true');
            }

            try {
                const authorData = await getProfile(doc.authorId);
                setAuthorProfile(authorData as unknown as UserProfile);
                
                if (user && user.$id !== doc.authorId) {
                    const followRecord = await checkIsFollowing(user.$id, doc.authorId);
                    setIsFollowing(!!followRecord);
                }
            } catch (e) {}

            if (user) {
                const likes = await databases.listDocuments(DB_ID, CollectionIDs.LIKES, [
                    Query.equal('articleId', id),
                    Query.equal('userId', user.$id)
                ]);
                setLiked(likes.documents.length > 0);
            }

            const commentsData = await databases.listDocuments(DB_ID, CollectionIDs.COMMENTS, [
                Query.equal('articleId', id),
                Query.orderDesc('$createdAt')
            ]);
            setComments(commentsData.documents as unknown as Comment[]);

        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => { fetchArticle(); }, [id, user]);

    // SEO & Sharing - Dynamic Meta Tag Update
    useEffect(() => {
        if (!article) return;

        // 1. Update Title
        document.title = `${article.title} - Pedium`;

        // 2. Helper to update/create meta tags
        const updateMeta = (selector: string, content: string) => {
            let element = document.querySelector(selector);
            if (!element) {
                element = document.createElement('meta');
                if (selector.startsWith('meta[property=')) {
                    element.setAttribute('property', selector.replace("meta[property='", "").replace("']", ""));
                } else if (selector.startsWith('meta[name=')) {
                    element.setAttribute('name', selector.replace("meta[name='", "").replace("']", ""));
                }
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const desc = article.summary || article.excerpt || "Read this article on Pedium.";
        const img = article.coverImage || "https://ui-avatars.com/api/?name=Pedium&background=242424&color=fff&size=512";

        updateMeta("meta[name='description']", desc);
        updateMeta("meta[property='og:title']", article.title);
        updateMeta("meta[property='og:description']", desc);
        updateMeta("meta[property='og:image']", img);
        updateMeta("meta[property='twitter:title']", article.title);
        updateMeta("meta[property='twitter:description']", desc);
        updateMeta("meta[property='twitter:image']", img);

        return () => {
             // Optional: Cleanup or reset to default tags when leaving article
             document.title = "Pedium – Where good ideas find you.";
        };

    }, [article]);


    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            if (scrollY > 400) setHeroVisible(false);
            else setHeroVisible(true);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const handleFollow = async () => {
        if (!user || !article) return;
        try {
            const newState = await toggleFollow(user.$id, article.authorId);
            setIsFollowing(newState);
        } catch (e) {
            alert("Error updating follow status");
        }
    };

    const handleLike = async () => {
        if (!user || !article) return;
        try {
            if (liked) {
                const likeDocs = await databases.listDocuments(DB_ID, CollectionIDs.LIKES, [
                    Query.equal('articleId', article.$id),
                    Query.equal('userId', user.$id)
                ]);
                if (likeDocs.documents.length > 0) {
                    await databases.deleteDocument(DB_ID, CollectionIDs.LIKES, likeDocs.documents[0].$id);
                    setLiked(false);
                    setArticle({...article, likesCount: Math.max(0, article.likesCount - 1)});
                    databases.updateDocument(DB_ID, CollectionIDs.ARTICLES, article.$id, { likesCount: Math.max(0, article.likesCount - 1) });
                }
            } else {
                await databases.createDocument(DB_ID, CollectionIDs.LIKES, ID.unique(), { articleId: article.$id, userId: user.$id });
                setLiked(true);
                setArticle({...article, likesCount: article.likesCount + 1});
                databases.updateDocument(DB_ID, CollectionIDs.ARTICLES, article.$id, { likesCount: article.likesCount + 1 });
            }
        } catch (e) {}
    };

    const toggleSpeech = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            // Strip HTML tags and combine text for smoother reading
            const speechText = blocks.map(b => {
                const text = b.data.text || "";
                // Simple HTML tag strip
                return text.replace(/<[^>]*>?/gm, '');
            }).join('. ');

            if (!speechText) return;

            const utterance = new SpeechSynthesisUtterance(speechText);
            
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            
            // Cancel any pending speech before starting new
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    const postComment = async () => {
        if (!user || !article || !newComment.trim()) return;
        try {
            let currentProfile = profile;
            if (!currentProfile) await refreshProfile();
            const avatar = (profile?.avatarUrl && profile.avatarUrl.startsWith('http')) ? profile.avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`;
            const comment = await databases.createDocument(DB_ID, CollectionIDs.COMMENTS, ID.unique(), {
                articleId: article.$id,
                userId: user.$id,
                userName: profile?.name || user.name,
                userAvatar: avatar,
                content: newComment
            });
            setComments([comment as unknown as Comment, ...comments]);
            setNewComment('');
        } catch (e) { alert("Failed to post"); }
    };

    if (!article) return <div className="min-h-screen bg-white dark:bg-[#121212]"><Navbar /><div className="h-screen flex items-center justify-center font-serif text-gray-500">Loading story...</div></div>;

    const displayAuthorName = authorProfile?.name || article.authorName;
    const displayAuthorAvatar = authorProfile?.avatarUrl || article.authorAvatar;

    return (
        <div className="min-h-screen bg-white dark:bg-[#121212] font-sans text-[#242424] dark:text-[#E0E0E0] transition-colors duration-300">
            <Navbar />
            
            {/* HERO BANNER - Fading Background */}
            <div className="relative w-full h-[60vh] md:h-[70vh] bg-gray-900">
                {article.coverImage && (
                    <>
                        <img 
                            src={article.coverImage} 
                            alt="Cover" 
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                            style={{ objectPosition: 'center' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-white dark:to-[#121212]"></div>
                    </>
                )}
            </div>

            {/* CONTENT CONTAINER - Scrolls over hero */}
            <div className="relative z-10 -mt-40 md:-mt-56 max-w-[740px] mx-auto bg-white dark:bg-[#121212] rounded-t-[3rem] px-6 md:px-12 pt-16 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors">
                
                {/* Title */}
                <h1 className="text-[36px] md:text-[52px] font-extrabold text-[#242424] dark:text-white mb-6 leading-[1.1] tracking-tight font-sans uppercase">
                    {article.title}
                </h1>
                
                {/* Subtitle */}
                <h2 className="text-[22px] md:text-[24px] text-[#757575] dark:text-[#a0a0a0] font-sans font-normal leading-[1.4] mb-10">
                     {article.summary || article.excerpt}
                </h2>

                {/* Author Metadata */}
                <div className="flex items-center justify-between mb-14 border-b border-gray-100 dark:border-gray-800 pb-8">
                    <div className="flex items-center gap-4">
                        <Link to={`/profile/${article.authorId}`}>
                            <img src={displayAuthorAvatar} alt={displayAuthorName} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Link to={`/profile/${article.authorId}`} className="block font-bold text-[#242424] dark:text-white hover:underline font-sans text-lg">
                                    {displayAuthorName}
                                </Link>
                                {user && user.$id !== article.authorId && (
                                    <button 
                                        onClick={handleFollow}
                                        className={`text-sm font-medium px-3 py-1 rounded-full transition-all ${isFollowing 
                                            ? 'border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400' 
                                            : 'text-green-700 dark:text-green-500 hover:text-green-800'}`}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                )}
                            </div>
                            <div className="text-[14px] text-[#757575] dark:text-[#999] font-sans flex items-center gap-2">
                                 <span>{format(new Date(article.$createdAt), 'MMM d, yyyy')}</span>
                                 <span>·</span>
                                 <Eye size={16}/> <span>{article.views} views</span>
                                 {user && (
                                    <button 
                                        onClick={toggleSpeech}
                                        className={`ml-2 p-1 rounded-full transition-colors ${
                                            isSpeaking 
                                            ? 'bg-black text-white dark:bg-white dark:text-black' 
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white'
                                        }`} 
                                        title={isSpeaking ? "Stop Listening" : "Listen"}
                                    >
                                        {isSpeaking ? <StopCircle size={16}/> : <PlayCircle size={16}/>}
                                    </button>
                                 )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-[#757575] dark:text-[#999]">
                         <Share2 size={22} className="hover:text-black dark:hover:text-white cursor-pointer" strokeWidth={1.5} />
                         <BookmarkPlus size={22} className="hover:text-black dark:hover:text-white cursor-pointer" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Article Content */}
                <div className="article-content">
                    {blocks.map((block, i) => <BlockRenderer key={block.id || i} block={block} />)}
                </div>
                
                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                    <div className="mt-16 flex flex-wrap gap-2">
                        {article.tags.map(tag => (
                            <Link to={`/?q=${tag}`} key={tag} className="bg-[#f2f2f2] dark:bg-[#1e1e1e] px-4 py-2 rounded-full text-sm text-[#242424] dark:text-gray-300 hover:bg-[#e6e6e6] dark:hover:bg-[#2a2a2a] transition-colors">
                                {tag}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Engagement / Claps */}
                <div className="mt-12 py-8 bg-white dark:bg-[#121212] border-t border-[#f2f2f2] dark:border-gray-800 flex items-center justify-between">
                     <div className="flex gap-8">
                        <button onClick={handleLike} className="flex items-center gap-2 text-[#757575] dark:text-[#a0a0a0] hover:text-black dark:hover:text-white transition-colors group">
                            <div className="p-2 rounded-full group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
                                <Heart size={24} fill={liked ? (localStorage.getItem('theme') === 'dark' ? "white" : "black") : "none"} stroke="currentColor" />
                            </div>
                            <span className="font-medium text-lg">{article.likesCount}</span>
                        </button>
                        <button className="flex items-center gap-2 text-[#757575] dark:text-[#a0a0a0] hover:text-black dark:hover:text-white transition-colors group">
                             <div className="p-2 rounded-full group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
                                <MessageCircle size={24} />
                             </div>
                             <span className="font-medium text-lg">{comments.length}</span>
                        </button>
                     </div>
                </div>
                
                {/* Responses */}
                <div className="bg-[#fafafa] dark:bg-[#1a1a1a] -mx-6 md:-mx-12 px-6 md:px-12 py-12 rounded-b-[3rem] mt-4 transition-colors">
                    <h3 className="font-bold text-xl mb-8 font-sans text-black dark:text-white">Responses ({comments.length})</h3>
                    
                    {user ? (
                        <div className="bg-white dark:bg-[#242424] p-6 rounded-2xl shadow-soft border border-[#f2f2f2] dark:border-gray-700 mb-10">
                            <div className="flex items-center gap-3 mb-4">
                                <img src={profile?.avatarUrl} className="w-10 h-10 rounded-full"/>
                                <span className="text-sm font-bold text-black dark:text-white">{profile?.name}</span>
                            </div>
                            <textarea 
                                value={newComment} 
                                onChange={e => setNewComment(e.target.value)} 
                                className="w-full border-none focus:ring-0 p-0 text-[#242424] dark:text-white placeholder-[#B3B3B1] dark:placeholder-gray-500 font-serif resize-none h-24 bg-transparent text-lg"
                                placeholder="What are your thoughts?"
                            />
                            <div className="flex justify-end mt-4">
                                <button 
                                    onClick={postComment}
                                    disabled={!newComment.trim()} 
                                    className="px-6 py-2 bg-[#1a8917] text-white rounded-full font-bold text-sm disabled:opacity-50 hover:bg-[#157312] transition-colors"
                                >
                                    Respond
                                </button>
                            </div>
                        </div>
                    ) : (
                         <div className="mb-10 p-8 bg-white dark:bg-[#242424] border border-[#f2f2f2] dark:border-gray-700 rounded-2xl text-center shadow-sm text-black dark:text-white">
                             <Link to="/login" className="text-[#1a8917] font-bold hover:underline">Sign in</Link> to join the conversation.
                         </div>
                    )}

                    <div className="space-y-8">
                        {comments.map(c => (
                            <div key={c.$id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 pb-8">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={c.userAvatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-700"/>
                                    <div>
                                        <span className="block text-sm font-bold text-[#242424] dark:text-white font-sans">{c.userName}</span>
                                        <span className="text-xs text-[#757575] dark:text-[#a0a0a0] font-sans">{format(new Date(c.$createdAt), 'MMM d')}</span>
                                    </div>
                                </div>
                                <p className="font-serif text-[#242424] dark:text-[#d0d0d0] text-[18px] leading-relaxed">{c.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Article;