import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { databases, DB_ID, CollectionIDs, Query } from '../lib/appwrite';
import { UserProfile } from '../types';
import { Link } from 'react-router-dom';
import { Loader2, Users, ArrowRight } from 'lucide-react';

const Authors: React.FC = () => {
    const [authors, setAuthors] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAuthors = async () => {
            try {
                const response = await databases.listDocuments(
                    DB_ID, 
                    CollectionIDs.PROFILES, 
                    [Query.orderDesc('followersCount'), Query.limit(20)]
                );
                setAuthors(response.documents as unknown as UserProfile[]);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchAuthors();
    }, []);

    return (
        <div className="min-h-screen bg-brand-light dark:bg-[#121212] transition-colors">
            <Navbar />
            
            <div className="bg-brand-dark dark:bg-[#1a1a1a] text-white py-20 px-4">
                <div className="max-w-5xl mx-auto text-center">
                     <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Top Writers</h1>
                     <p className="text-purple-200 dark:text-gray-400 text-lg">Discover the voices shaping the Pedium community.</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-12 -mt-10">
                {loading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-brand-primary" size={40} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {authors.map((author, index) => (
                            <Link to={`/profile/${author.userId}`} key={author.$id} className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                     <img src={author.avatarUrl} alt={author.name} className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 dark:border-gray-700 group-hover:border-brand-primary/20 transition-colors" />
                                     <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-primary text-white font-bold rounded-full flex items-center justify-center shadow-lg text-sm bg-black dark:bg-white dark:text-black">
                                         #{index + 1}
                                     </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-brand-primary transition-colors">{author.name}</h3>
                                <p className="text-slate-500 dark:text-gray-400 text-sm mb-6 line-clamp-2 h-10">{author.bio}</p>
                                
                                <div className="mt-auto w-full pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                     <span>{author.followersCount} Followers</span>
                                     <span className="text-brand-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">View <ArrowRight size={14}/></span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Authors;