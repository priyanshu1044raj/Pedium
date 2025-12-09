import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { databases, DB_ID, CollectionIDs, Query, ID, getProfile } from '../lib/appwrite';
import { Article as ArticleType, Comment, UserProfile } from '../types';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageSquare, Share2, Send, Loader2, Check } from 'lucide-react';

const BlockRenderer: React.FC<{ block: any }> = ({ block }) => {
    switch (block.type) {
        case 'header':
            const Tag = `h${block.data.level}` as React.ElementType;
            const sizes = {
                1: 'text-3xl md:text-4xl',
                2: 'text-2xl md:text-3xl',
                3: 'text-xl md:text-2xl',
                4: 'text-lg md:text-xl',
            };
            return <Tag className={`font-serif font-bold mt-12 mb-4 text-black ${(sizes as any)[block.data.level] || 'text-xl'} leading-tight`} dangerouslySetInnerHTML={{ __html: block.data.text }} />;
        case 'paragraph':
            return <p className="mb-6 font-serif text-[1.15rem] leading-[1.8] text-gray-800 antialiased" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
        case 'image':
            return (
                <figure className="my-12">
                    <img src={block.data.file.url} alt={block.data.caption} className="w-full rounded-sm" />
                    {block.data.caption && <figcaption className="text-center text-sm text-gray-500 mt-4 font-sans">{block.data.caption}</figcaption>}
                </figure>
            );
        case 'list':
            return (
                <ul className={`my-8 ml-6 space-y-3 font-serif text-[1.1rem] text-gray-800 ${block.data.style === 'ordered' ? 'list-decimal' : 'list-disc'}`}>
                    {block.data.items.map((item: string, i: number) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: item }} className="pl-2" />
                    ))}
                </ul>
            );
        case 'quote':
            return (
                <blockquote className="border-l-4 border-black pl-8 my-12 italic text-2xl font-serif text-gray-900 leading-relaxed">
                    "{block.data.text}"
                    {block.data.caption && <cite className="block text-base not-italic mt-4 text-gray-500 font-sans tracking-wide uppercase">— {block.data.caption}</cite>}
                </blockquote>
            );
        case 'delimiter':
            return <div className="flex justify-center text-3xl my-16 tracking-widest text-gray-300">...</div>;
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
    const [isCopied, setIsCopied] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    const fetchArticle = async () => {
        if (!id) return;
        try {
            const doc = await databases.getDocument(DB_ID, CollectionIDs.ARTICLES, id);
            setArticle(doc as unknown as ArticleType);
            const content = JSON.parse(doc.content);
            setBlocks(content.blocks);
            
            const storageKey = `viewed_article_${id}`;
            if (!localStorage.getItem(storageKey)) {
                databases.updateDocument(DB_ID, CollectionIDs.ARTICLES, id, {
                    views: (doc.views || 0) + 1
                }).catch(console.error);
                localStorage.setItem(storageKey, 'true');
            }

            try {
                const authorData = await getProfile(doc.authorId);
                setAuthorProfile(authorData as unknown as UserProfile);
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

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({ title: article?.title, url: window.location.href });
        } else {
            await navigator.clipboard.writeText(window.location.href);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const postComment = async () => {
        if (!user || !article || !newComment.trim()) return;
        setIsPosting(true);
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
        finally { setIsPosting(false); }
    };

    if (!article) return <div className="min-h-screen bg-white"><Navbar /><div className="flex justify-center pt-20"><Loader2 className="animate-spin text-gray-400"/></div></div>;

    const displayAuthorName = authorProfile?.name || article.authorName;
    const displayAuthorAvatar = authorProfile?.avatarUrl || article.authorAvatar;

    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            
            <article className="max-w-4xl mx-auto px-4 py-16">
                <header className="mb-12 max-w-3xl mx-auto text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-4 mb-8">
                        {article.tags?.map(tag => (
                            <span key={tag} className="text-xs font-bold uppercase tracking-widest text-gray-500 border border-gray-200 px-3 py-1 rounded-full">{tag}</span>
                        ))}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-black mb-8 leading-tight">{article.title}</h1>
                    
                    <div className="flex items-center justify-center md:justify-start gap-4">
                        <Link to={`/profile/${article.authorId}`}>
                            <img src={displayAuthorAvatar} alt={displayAuthorName} className="w-12 h-12 rounded-full object-cover" />
                        </Link>
                        <div>
                            <Link to={`/profile/${article.authorId}`} className="block font-medium text-black hover:underline">{displayAuthorName}</Link>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                <span>{format(new Date(article.$createdAt), 'MMM d, yyyy')}</span>
                                <span>•</span>
                                <span>{Math.max(1, Math.ceil(blocks.length / 4))} min read</span>
                            </div>
                        </div>
                    </div>
                </header>

                {article.coverImage && (
                    <div className="mb-16">
                        <img src={article.coverImage} alt="Cover" className="w-full h-auto rounded-sm max-h-[600px] object-cover" />
                    </div>
                )}

                <div className="max-w-[700px] mx-auto">
                    {blocks.map((block, i) => <BlockRenderer key={block.id || i} block={block} />)}
                </div>

                <div className="max-w-[700px] mx-auto mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
                     <div className="flex gap-6">
                        <button onClick={handleLike} className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors">
                            <Heart size={24} fill={liked ? "black" : "none"} className={liked ? "text-black" : ""} />
                            <span>{article.likesCount}</span>
                        </button>
                        <div className="flex items-center gap-2 text-gray-500">
                             <MessageSquare size={24} />
                             <span>{comments.length}</span>
                        </div>
                     </div>
                     <button onClick={handleShare} className="text-gray-500 hover:text-black">
                         {isCopied ? <Check size={24}/> : <Share2 size={24} />}
                     </button>
                </div>
                
                {/* Comments */}
                <div className="max-w-[700px] mx-auto mt-16 bg-gray-50/50 p-8 rounded-xl">
                    <h3 className="font-serif font-bold text-2xl mb-8">Responses</h3>
                    {user && (
                        <div className="mb-8">
                            <textarea 
                                value={newComment} 
                                onChange={e => setNewComment(e.target.value)} 
                                className="w-full p-4 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black mb-2 font-serif text-lg bg-white"
                                placeholder="What are your thoughts?"
                                rows={3}
                            />
                            <button 
                                onClick={postComment}
                                disabled={isPosting || !newComment.trim()} 
                                className="px-6 py-2 bg-black text-white rounded-full font-medium text-sm hover:bg-gray-800 disabled:opacity-50"
                            >
                                {isPosting ? "Posting..." : "Respond"}
                            </button>
                        </div>
                    )}
                    <div className="space-y-6">
                        {comments.map(c => (
                            <div key={c.$id} className="border-b border-gray-100 last:border-0 pb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <img src={c.userAvatar} className="w-8 h-8 rounded-full"/>
                                    <span className="font-bold text-sm">{c.userName}</span>
                                    <span className="text-gray-400 text-xs">{format(new Date(c.$createdAt), 'MMM d')}</span>
                                </div>
                                <p className="font-serif text-gray-800">{c.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </article>
        </div>
    );
};

export default Article;