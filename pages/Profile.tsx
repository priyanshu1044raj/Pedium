import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { databases, DB_ID, CollectionIDs, Query, uploadFile, getProfile, toggleFollow, checkIsFollowing } from '../lib/appwrite';
import { Article, UserProfile } from '../types';
import { Link, useParams } from 'react-router-dom';
import { Camera, Save, X, Loader2, Calendar, Edit2, User, BookOpen, Heart, Eye, Grid, PenTool } from 'lucide-react';
import { format } from 'date-fns';

const Profile: React.FC = () => {
    const { userId } = useParams();
    const { user, profile: myProfile, refreshProfile } = useAuth();
    
    const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [isFollowing, setIsFollowing] = useState(false);

    const isOwnProfile = !userId || (user && user.$id === userId);

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                let targetProfile: UserProfile | null = null;
                const targetUserId = userId || user?.$id;

                if (!targetUserId) {
                    setLoading(false);
                    return;
                }

                if (isOwnProfile && myProfile) {
                    targetProfile = myProfile;
                } else {
                    const fetched = await getProfile(targetUserId);
                    targetProfile = fetched as unknown as UserProfile;
                }

                setViewedProfile(targetProfile);
                
                if (targetProfile) {
                    setEditName(targetProfile.name);
                    setEditBio(targetProfile.bio);
                    
                    const res = await databases.listDocuments(DB_ID, CollectionIDs.ARTICLES, [
                        Query.equal('authorId', targetProfile.userId),
                        Query.orderDesc('$createdAt')
                    ]);
                    setArticles(res.documents as unknown as Article[]);

                    if (user && !isOwnProfile) {
                        const following = await checkIsFollowing(user.$id, targetProfile.userId);
                        setIsFollowing(!!following);
                    }
                }
            } catch (e) {
                console.error("Error fetching profile data", e);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId, user, myProfile, isOwnProfile]);

    const handleSave = async () => {
        if (!viewedProfile || !isOwnProfile) return;
        setIsSaving(true);
        try {
            let avatarUrl = viewedProfile.avatarUrl;
            if (avatarFile) {
                avatarUrl = await uploadFile(avatarFile);
            }

            await databases.updateDocument(DB_ID, CollectionIDs.PROFILES, viewedProfile.$id, {
                name: editName,
                bio: editBio,
                avatarUrl: avatarUrl
            });
            await refreshProfile();
            setIsEditing(false);
            setAvatarFile(null);
        } catch (e) {
            console.error(e);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!user || !viewedProfile) return alert("Login to follow");
        try {
            const newState = await toggleFollow(user.$id, viewedProfile.userId);
            setIsFollowing(newState);
            // Optimistic update of followers count
            setViewedProfile({
                ...viewedProfile,
                followersCount: (viewedProfile.followersCount || 0) + (newState ? 1 : -1)
            });
        } catch (e) { console.error(e); }
    };

    if (loading) return (
        <div className="min-h-screen bg-white dark:bg-[#121212]">
            <Navbar />
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="animate-spin text-black dark:text-white" size={40} />
            </div>
        </div>
    );

    if (!viewedProfile) return (
        <div className="min-h-screen bg-white dark:bg-[#121212]">
            <Navbar />
            <div className="text-center mt-20 text-gray-400 font-bold text-xl">User not found.</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white dark:bg-[#121212] font-sans pb-20 transition-colors">
            <Navbar />
            
            {/* Header Card */}
            <div className="border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-4xl mx-auto px-4 py-16">
                     <div className="flex flex-col md:flex-row items-start gap-10">
                         {/* Avatar Section */}
                         <div className="relative group">
                             <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800">
                                 <img 
                                     src={avatarFile ? URL.createObjectURL(avatarFile) : viewedProfile.avatarUrl} 
                                     alt="Profile" 
                                     className="w-full h-full rounded-full object-cover" 
                                 />
                             </div>
                             {isEditing && (
                                 <label className="absolute bottom-0 right-0 p-3 bg-black text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                                     <Camera size={18} />
                                     <input type="file" className="hidden" onChange={e => e.target.files && setAvatarFile(e.target.files[0])} accept="image/*" />
                                 </label>
                             )}
                         </div>

                         {/* Info Section */}
                         <div className="flex-1 w-full">
                             {isEditing ? (
                                 <div className="space-y-4 max-w-lg animate-in fade-in duration-300">
                                     <input 
                                         className="text-4xl font-sans font-bold border-b border-gray-200 dark:border-gray-700 w-full focus:outline-none focus:border-black dark:focus:border-white pb-2 bg-transparent text-black dark:text-white placeholder-gray-300" 
                                         value={editName} 
                                         onChange={e => setEditName(e.target.value)} 
                                         placeholder="Your Name"
                                     />
                                     <textarea 
                                         className="w-full border-none bg-gray-50 dark:bg-[#1E1E1E] rounded-xl p-4 focus:ring-1 focus:ring-black dark:focus:ring-white h-32 resize-none text-lg text-gray-700 dark:text-gray-300 font-serif" 
                                         value={editBio} 
                                         onChange={e => setEditBio(e.target.value)} 
                                         placeholder="Tell us about yourself..."
                                     />
                                     <div className="flex gap-3">
                                         <button onClick={handleSave} disabled={isSaving} className="bg-green-700 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-green-800 transition-all text-sm">
                                             {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                                         </button>
                                         <button onClick={() => setIsEditing(false)} className="bg-white dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors text-sm">
                                             Cancel
                                         </button>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="animate-in fade-in duration-300">
                                     <div className="flex justify-between items-start mb-4">
                                         <div>
                                            <h1 className="text-4xl font-sans font-extrabold text-black dark:text-white mb-2">{viewedProfile.name}</h1>
                                            <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed font-serif">{viewedProfile.bio || "No bio yet."}</p>
                                         </div>
                                         {isOwnProfile ? (
                                             <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-green-700 dark:text-green-500 hover:text-green-800">
                                                 Edit Profile
                                             </button>
                                         ) : (
                                             <button 
                                                onClick={handleFollowToggle}
                                                className={`px-5 py-2 rounded-full font-medium text-sm transition-all ${
                                                    isFollowing 
                                                    ? 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-800 hover:text-gray-900' 
                                                    : 'bg-green-700 text-white hover:bg-green-800'
                                                }`}
                                             >
                                                 {isFollowing ? 'Following' : 'Follow'}
                                             </button>
                                         )}
                                     </div>
                                     
                                     <div className="flex gap-6 mt-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                                         <span className="cursor-pointer hover:text-black dark:hover:text-white hover:underline">{viewedProfile.followersCount || 0} Followers</span>
                                         <span className="cursor-pointer hover:text-black dark:hover:text-white hover:underline">{articles.length} Stories</span>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="border-b border-gray-100 dark:border-gray-800 mb-8 pb-4">
                    <span className="font-bold text-sm uppercase tracking-wide border-b border-black dark:border-white pb-4 text-black dark:text-white">Latest</span>
                </div>
                
                <div className="grid gap-10">
                    {articles.length === 0 && (
                        <div className="text-center py-24 bg-gray-50 dark:bg-[#1E1E1E] rounded-3xl">
                            <PenTool size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
                            <p className="text-gray-500 dark:text-gray-400 font-bold mb-4">No stories published yet.</p>
                            {isOwnProfile && <Link to="/write" className="text-green-700 dark:text-green-500 font-bold hover:underline">Write a story</Link>}
                        </div>
                    )}
                    
                    {articles.map(article => (
                        <div key={article.$id} className="flex flex-col md:flex-row gap-8 border-b border-gray-100 dark:border-gray-800 pb-10 last:border-0">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{format(new Date(article.$createdAt), 'MMM d, yyyy')}</span>
                                </div>
                                <Link to={`/article/${article.$id}`} className="group">
                                    <h3 className="text-2xl font-bold text-black dark:text-white mb-2 group-hover:underline decoration-gray-400 decoration-1">
                                        {article.title}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4 line-clamp-3 font-serif text-lg">
                                        {article.excerpt}
                                    </p>
                                </Link>
                                <div className="flex items-center gap-6 text-xs text-gray-400 dark:text-gray-500 mt-4">
                                    <span className="bg-gray-100 dark:bg-[#1E1E1E] px-3 py-1 rounded-full text-gray-600 dark:text-gray-300">{article.tags?.[0] || 'Story'}</span>
                                    <span className="flex items-center gap-1"><Heart size={14}/> {article.likesCount}</span>
                                    <span className="flex items-center gap-1"><Eye size={14}/> {article.views}</span>
                                </div>
                            </div>
                            {article.coverImage && (
                                <Link to={`/article/${article.$id}`} className="w-full md:w-48 h-32 flex-shrink-0">
                                     <img src={article.coverImage} alt="Cover" className="w-full h-full object-cover rounded-md" />
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Profile;