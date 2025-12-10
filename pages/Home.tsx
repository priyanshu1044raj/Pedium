import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { databases, DB_ID, CollectionIDs, Query, getProfile, checkIsFollowing, toggleFollow } from '../lib/appwrite';
import { Article, UserProfile } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { BookmarkPlus, MessageCircle, Heart, ArrowUpRight, Sparkles, TrendingUp, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EnrichedArticle extends Article {
    realAuthorAvatar?: string;
    realAuthorName?: string;
    realAuthorBio?: string;
}

const FollowButton: React.FC<{ authorId: string }> = ({ authorId }) => {
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user && user.$id !== authorId) {
            checkIsFollowing(user.$id, authorId).then(res => setIsFollowing(!!res));
        }
    }, [user, authorId]);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!user) return alert("Please sign in to follow authors.");
        setLoading(true);
        try {
            const newState = await toggleFollow(user.$id, authorId);
            setIsFollowing(newState);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (!user || user.$id === authorId) return null;

    return (
        <button 
            onClick={handleClick}
            disabled={loading}
            className={`text-xs font-bold rounded-full px-4 py-1.5 transition-all ${
                isFollowing 
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700' 
                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
            }`}
        >
            {isFollowing ? 'Following' : 'Follow'}
        </button>
    );
};

const Home: React.FC = () => {
    const { user } = useAuth();
    const [articles, setArticles] = useState<EnrichedArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Filters: 'latest', 'trending', 'for_you' OR specific tag via searchParams
    const [feedType, setFeedType] = useState<'latest' | 'trending' | 'for_you'>('latest');
    const searchQuery = searchParams.get('q');
    
    // Sidebar State
    const [topAuthors, setTopAuthors] = useState<UserProfile[]>([]);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                let queries: string[] = [];

                if (searchQuery) {
                    queries = [Query.orderDesc('$createdAt'), Query.limit(100)];
                } else if (feedType === 'trending') {
                    queries = [Query.orderDesc('views'), Query.limit(20)];
                } else if (feedType === 'for_you' && user) {
                    const follows = await databases.listDocuments(DB_ID, CollectionIDs.FOLLOWS, [
                        Query.equal('follower_id', user.$id)
                    ]);
                    const followingIds = follows.documents.map((d: any) => d.following_id);
                    
                    if (followingIds.length > 0) {
                        queries = [
                            Query.equal('authorId', followingIds),
                            Query.orderDesc('$createdAt'),
                            Query.limit(20)
                        ];
                    } else {
                        setArticles([]);
                        setLoading(false);
                        return;
                    }
                } else {
                    queries = [Query.orderDesc('$createdAt'), Query.limit(20)];
                }

                const response = await databases.listDocuments(
                    DB_ID, 
                    CollectionIDs.ARTICLES, 
                    queries
                );
                
                let filteredDocs = response.documents as unknown as Article[];
                
                if (searchQuery) {
                    const lowerQ = searchQuery.toLowerCase();
                    filteredDocs = filteredDocs.filter((d) => 
                        d.title.toLowerCase().includes(lowerQ) || 
                        d.tags?.some(tag => tag.toLowerCase().includes(lowerQ))
                    );
                }
                
                const enriched = await Promise.all(filteredDocs.map(async (art) => {
                    try {
                        const authorProfile = await getProfile(art.authorId) as unknown as UserProfile;
                        return {
                            ...art,
                            realAuthorAvatar: authorProfile?.avatarUrl || art.authorAvatar,
                            realAuthorName: authorProfile?.name || art.authorName,
                            realAuthorBio: authorProfile?.bio
                        };
                    } catch {
                        return { ...art, realAuthorAvatar: art.authorAvatar, realAuthorName: art.authorName };
                    }
                }));

                setArticles(enriched);

                const authorRes = await databases.listDocuments(DB_ID, CollectionIDs.PROFILES, [Query.limit(4), Query.orderDesc('followersCount')]);
                setTopAuthors(authorRes.documents as unknown as UserProfile[]);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [searchQuery, feedType, user]);

    const recommendedTopics = ["Programming", "AI", "Design", "Psychology", "Money", "Business"];

    const handleTabChange = (type: 'latest' | 'trending' | 'for_you') => {
        setSearchParams({});
        setFeedType(type);
    };

    return (
        <div className="min-h-screen bg-[#F9F9F9] dark:bg-[#121212] text-brand-black dark:text-[#E0E0E0] font-sans transition-colors duration-300">
            <Navbar />
            
            {/* Elegant Hero (Logged Out Only) */}
            {!user && !searchQuery && feedType === 'latest' && (
                <div className="bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800 transition-colors">
                    <div className="max-w-6xl mx-auto px-6 py-24 text-center">
                        <h1 className="text-5xl md:text-7xl font-logo font-bold tracking-tight mb-6 text-gray-900 dark:text-white uppercase">
                            Where ideas find their home.
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-serif mb-10 max-w-2xl mx-auto leading-relaxed">
                            Discover stories, thinking, and expertise from writers on any topic.
                        </p>
                        <Link to="/register" className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full text-lg font-bold hover:scale-105 transition-transform shadow-lg shadow-gray-200 dark:shadow-none">
                            Start Reading <ArrowUpRight size={20} />
                        </Link>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* FEED COLUMN (Left - 8 Cols) */}
                    <div className="lg:col-span-8">
                        
                        {/* Feed Filter Tabs */}
                        <div className="flex items-center gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
                            <button 
                                onClick={() => handleTabChange('for_you')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm transition-colors flex-shrink-0 ${
                                    feedType === 'for_you' && !searchQuery 
                                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                                    : 'bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <Sparkles size={16} /> For You
                            </button>
                            <button 
                                onClick={() => handleTabChange('trending')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm transition-colors flex-shrink-0 ${
                                    feedType === 'trending' && !searchQuery 
                                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                                    : 'bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <TrendingUp size={16} /> Trending
                            </button>
                            {recommendedTopics.map(topic => (
                                <Link 
                                    to={`/?q=${topic}`} 
                                    key={topic} 
                                    className={`px-5 py-2.5 rounded-full text-sm font-medium shadow-sm transition-colors flex-shrink-0 ${
                                        searchQuery === topic 
                                        ? 'bg-black text-white dark:bg-white dark:text-black font-bold' 
                                        : 'bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    {topic}
                                </Link>
                            ))}
                        </div>

                        {/* Articles Feed */}
                        <div className="space-y-8">
                            {loading ? (
                                [1, 2].map(i => <div key={i} className="h-64 bg-white dark:bg-[#1E1E1E] rounded-3xl animate-pulse shadow-sm"></div>)
                            ) : articles.length > 0 ? (
                                articles.map((article) => (
                                    <article key={article.$id} className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100 dark:hover:border-gray-800 group">
                                        
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Link to={`/profile/${article.authorId}`} className="block relative">
                                                    <img src={article.realAuthorAvatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-700"/>
                                                </Link>
                                                <div>
                                                    <Link to={`/profile/${article.authorId}`} className="block text-sm font-bold text-gray-900 dark:text-white hover:underline">
                                                        {article.realAuthorName}
                                                    </Link>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                                                        {format(new Date(article.$createdAt), 'MMM d')} 
                                                        <span className="mx-1">·</span> 
                                                        <Eye size={12} /> {article.views} views
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <BookmarkPlus size={20} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Main Content Area */}
                                        <Link to={`/article/${article.$id}`} className="block group cursor-pointer">
                                            <div className="flex flex-col-reverse md:flex-row gap-6">
                                                <div className="flex-1">
                                                    <h2 className="text-2xl md:text-[28px] font-bold text-gray-900 dark:text-gray-100 mb-3 font-sans leading-tight tracking-tight group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors uppercase">
                                                        {article.title}
                                                    </h2>
                                                    <p className="text-gray-500 dark:text-gray-400 font-serif text-[18px] leading-relaxed line-clamp-3 mb-4 md:mb-0">
                                                        {article.summary || article.excerpt}
                                                    </p>
                                                </div>
                                                {article.coverImage && (
                                                    <div className="w-full md:w-[200px] h-48 md:h-[140px] flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                        <img 
                                                            src={article.coverImage} 
                                                            alt="" 
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </Link>

                                        {/* Footer / Tags */}
                                        <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                                            <div className="flex gap-2 flex-wrap">
                                                {article.tags?.slice(0, 3).map(tag => (
                                                    <Link to={`/?q=${tag}`} key={tag} className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        {tag}
                                                    </Link>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-6 text-gray-400 text-sm font-medium">
                                                <div className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer">
                                                    <Heart size={18} strokeWidth={2} /> 
                                                    <span>{article.likesCount}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 hover:text-blue-500 transition-colors cursor-pointer">
                                                    <MessageCircle size={18} strokeWidth={2} />
                                                    <span>Reply</span>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className="text-center py-24 bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm">
                                    <div className="inline-block p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-4">
                                        <Sparkles size={32} className="text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">
                                        {feedType === 'for_you' ? "No following updates." : "No stories found."}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                                        {feedType === 'for_you' 
                                            ? "Follow authors to see their stories here." 
                                            : "Try a different search or explore topics."}
                                    </p>
                                    {feedType === 'for_you' && (
                                        <Link to="/authors" className="text-black dark:text-white font-bold hover:underline">
                                            Browse Authors
                                        </Link>
                                    )}
                                    {searchQuery && (
                                        <button onClick={() => { setSearchParams({}); }} className="text-black dark:text-white font-bold hover:underline">
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SIDEBAR COLUMN (Right - 4 Cols) */}
                    <div className="hidden lg:block lg:col-span-4 space-y-8">
                        
                        {/* Top Authors Widget */}
                        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-24 transition-colors">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Sparkles size={18} className="text-yellow-500" fill="currentColor"/> 
                                Writers to follow
                            </h3>
                            <div className="space-y-6">
                                {topAuthors.map(author => (
                                    <div key={author.$id} className="flex items-start justify-between gap-3">
                                        <div className="flex gap-3 overflow-hidden">
                                            <img src={author.avatarUrl} className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800"/>
                                            <div className="min-w-0">
                                                <Link to={`/profile/${author.userId}`} className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:underline">{author.name}</Link>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{author.bio || "Writer"}</p>
                                            </div>
                                        </div>
                                        <FollowButton authorId={author.userId} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800">
                                <Link to="/authors" className="text-sm font-bold text-green-700 dark:text-green-500 hover:text-green-800 flex items-center gap-1">
                                    See all writers <ArrowUpRight size={14}/>
                                </Link>
                            </div>
                        </div>

                        {/* Topics Widget */}
                        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
                             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Discover Topics</h3>
                             <div className="flex flex-wrap gap-2">
                                {recommendedTopics.map(topic => (
                                    <Link to={`/?q=${topic}`} key={topic} className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors">
                                        {topic}
                                    </Link>
                                ))}
                             </div>
                        </div>
                        
                        {/* Footer Links */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-600 px-2">
                            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-400">Help</a>
                            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-400">Status</a>
                            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-400">Writers</a>
                            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-400">Blog</a>
                            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-400">Privacy</a>
                            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-400">Terms</a>
                            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-400">About</a>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;