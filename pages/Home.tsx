import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { databases, DB_ID, CollectionIDs, Query, getProfile } from '../lib/appwrite';
import { Article, UserProfile } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight, PenTool } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EnrichedArticle extends Article {
    realAuthorAvatar?: string;
    realAuthorName?: string;
}

const Home: React.FC = () => {
    const { user } = useAuth();
    const [articles, setArticles] = useState<EnrichedArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('q');

    useEffect(() => {
        const fetchArticles = async () => {
            setLoading(true);
            try {
                const response = await databases.listDocuments(
                    DB_ID, 
                    CollectionIDs.ARTICLES, 
                    [Query.orderDesc('$createdAt'), Query.limit(searchQuery ? 100 : 20)]
                );
                
                let filteredDocs = response.documents as unknown as Article[];

                if (searchQuery) {
                    const lowerQ = searchQuery.toLowerCase();
                    filteredDocs = filteredDocs.filter((d) => 
                        d.title.toLowerCase().includes(lowerQ) || 
                        d.tags?.some(tag => tag.toLowerCase().includes(lowerQ)) ||
                        d.content.toLowerCase().includes(lowerQ)
                    );
                }
                
                const enriched = await Promise.all(filteredDocs.map(async (art) => {
                    try {
                        const authorProfile = await getProfile(art.authorId) as unknown as UserProfile;
                        return {
                            ...art,
                            realAuthorAvatar: authorProfile?.avatarUrl || art.authorAvatar,
                            realAuthorName: authorProfile?.name || art.authorName
                        };
                    } catch {
                        return { ...art, realAuthorAvatar: art.authorAvatar, realAuthorName: art.authorName };
                    }
                }));

                setArticles(enriched);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, [searchQuery]);

    // Categories
    const categories = ["Technology", "Design", "Culture", "Business", "Politics", "Science", "Health"];

    return (
        <div className="min-h-screen bg-white text-brand-black">
            <Navbar />
            
            {/* Minimalist Hero - Only if not searching */}
            {!searchQuery && (
                <div className="border-b border-gray-100">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-20 md:py-28">
                        {!user ? (
                            <div className="max-w-4xl">
                                <h1 className="text-6xl md:text-8xl font-serif font-medium tracking-tight leading-[1.1] mb-8 text-black">
                                    Stay curious.
                                </h1>
                                <p className="text-xl md:text-2xl text-gray-600 font-sans font-light max-w-2xl mb-10 leading-relaxed">
                                    Discover stories, thinking, and expertise from writers on any topic.
                                </p>
                                <Link to="/register" className="inline-block bg-black text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-gray-800 transition-all">
                                    Start reading
                                </Link>
                            </div>
                        ) : (
                            <div className="max-w-4xl">
                                <h1 className="text-5xl md:text-7xl font-serif font-medium tracking-tight leading-[1.1] text-black">
                                    Welcome back, <br/>
                                    <span className="text-gray-400 italic">{user.name.split(' ')[0]}.</span>
                                </h1>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Categories Sticky Bar */}
            {!searchQuery && (
                <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                     <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 overflow-x-auto no-scrollbar py-4">
                        <div className="flex items-center gap-8">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Discover</span>
                            {categories.map(cat => (
                                <Link to={`/?q=${cat}`} key={cat} className="text-sm font-medium text-gray-500 hover:text-black transition-colors whitespace-nowrap">
                                    {cat}
                                </Link>
                            ))}
                        </div>
                     </div>
                </div>
            )}

            <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-16">
                {searchQuery && (
                    <div className="mb-16 border-b border-gray-100 pb-8">
                        <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Search Results</p>
                        <h2 className="text-4xl font-serif font-bold text-black">"{searchQuery}"</h2>
                    </div>
                )}

                {/* Articles Grid - Premium Bento/Masonry Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
                    {loading ? [1,2,3,4,5,6].map(i => (
                        <div key={i} className="animate-pulse space-y-4">
                            <div className="bg-gray-100 h-64 w-full rounded-sm"></div>
                            <div className="h-4 bg-gray-100 w-3/4"></div>
                            <div className="h-4 bg-gray-100 w-1/2"></div>
                        </div>
                    )) : articles.map((article, index) => (
                        <Link to={`/article/${article.$id}`} key={article.$id} className="group flex flex-col h-full cursor-pointer">
                            <div className="relative overflow-hidden mb-6 rounded-sm aspect-[16/10]">
                                <img 
                                    src={article.coverImage} 
                                    alt="Cover" 
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
                                />
                                {article.tags?.[0] && (
                                    <div className="absolute top-4 left-4 bg-white text-black text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
                                        {article.tags[0]}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col flex-grow">
                                <div className="flex items-center gap-3 mb-4">
                                    <img src={article.realAuthorAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">{article.realAuthorName}</span>
                                    <span className="text-xs text-gray-300">•</span>
                                    <span className="text-xs text-gray-400 font-medium">{format(new Date(article.$createdAt), 'MMM d')}</span>
                                </div>
                                
                                <h3 className="text-2xl font-serif font-bold text-black mb-3 leading-tight group-hover:underline decoration-1 underline-offset-4 decoration-gray-300">
                                    {article.title}
                                </h3>
                                
                                <p className="text-gray-500 font-serif text-lg leading-relaxed mb-6 line-clamp-3">
                                    {article.summary || article.excerpt}
                                </p>
                                
                                <div className="mt-auto flex items-center text-sm font-medium text-black group-hover:opacity-70 transition-opacity">
                                    Read story <ArrowRight size={16} className="ml-2" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
                
                {!loading && articles.length === 0 && !searchQuery && (
                     <div className="text-center py-32 border-t border-gray-100 mt-10">
                         <PenTool size={48} className="text-gray-300 mx-auto mb-6" />
                         <h3 className="text-2xl font-serif font-bold text-black mb-4">It's quiet here.</h3>
                         <p className="text-gray-500 mb-8 max-w-md mx-auto">Be the first to publish a masterpiece on Pedium.</p>
                         <Link to="/write" className="bg-black text-white px-8 py-3 rounded-full font-medium inline-block hover:bg-gray-800 transition-colors">Start Writing</Link>
                     </div>
                )}
            </div>
        </div>
    );
};

export default Home;