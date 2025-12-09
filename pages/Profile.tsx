import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { databases, DB_ID, CollectionIDs, Query, uploadFile, getProfile } from '../lib/appwrite';
import { Article, UserProfile } from '../types';
import { Link, useParams } from 'react-router-dom';
import { Camera, Save, X, Loader2, Calendar, Edit2, User } from 'lucide-react';
import { format } from 'date-fns';

const Profile: React.FC = () => {
    const { userId } = useParams();
    const { user, profile: myProfile, refreshProfile } = useAuth();
    
    // State to hold the profile being viewed (mine or someone else's)
    const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    
    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

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
                    
                    // Fetch Articles
                    const res = await databases.listDocuments(DB_ID, CollectionIDs.ARTICLES, [
                        Query.equal('authorId', targetProfile.userId),
                        Query.orderDesc('$createdAt')
                    ]);
                    setArticles(res.documents as unknown as Article[]);
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
            await refreshProfile(); // Update context
            setIsEditing(false);
            setAvatarFile(null);
        } catch (e) {
            console.error(e);
            alert("Failed to save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-brand-light">
            <Navbar />
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="animate-spin text-brand-primary" size={32} />
            </div>
        </div>
    );

    if (!viewedProfile) return (
        <div className="min-h-screen bg-brand-light">
            <Navbar />
            <div className="text-center mt-20 text-slate-500">Profile not found.</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-light">
            <Navbar />
            
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-4 py-12">
                     <div className="flex flex-col md:flex-row items-start gap-8">
                         <div className="relative group">
                             <img 
                                 src={avatarFile ? URL.createObjectURL(avatarFile) : viewedProfile.avatarUrl} 
                                 alt="Profile" 
                                 className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg ring-1 ring-gray-100" 
                             />
                             {isEditing && (
                                 <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Camera className="text-white" />
                                     <input type="file" className="hidden" onChange={e => e.target.files && setAvatarFile(e.target.files[0])} accept="image/*" />
                                 </label>
                             )}
                         </div>

                         <div className="flex-1 w-full">
                             {isEditing ? (
                                 <div className="space-y-4 max-w-lg animate-in fade-in duration-300">
                                     <input 
                                         className="text-3xl font-bold font-display border-b border-gray-300 w-full focus:outline-none focus:border-brand-primary pb-2 bg-transparent" 
                                         value={editName} 
                                         onChange={e => setEditName(e.target.value)} 
                                         placeholder="Your Name"
                                     />
                                     <textarea 
                                         className="w-full border p-3 rounded-xl border-gray-200 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-24 resize-none text-slate-600" 
                                         value={editBio} 
                                         onChange={e => setEditBio(e.target.value)} 
                                         placeholder="Tell us about yourself..."
                                     />
                                     <div className="flex gap-3">
                                         <button onClick={handleSave} disabled={isSaving} className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-brand-secondary transition-colors">
                                             {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} Save Changes
                                         </button>
                                         <button onClick={() => setIsEditing(false)} className="bg-gray-100 text-gray-600 px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                                             <X size={16}/> Cancel
                                         </button>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="animate-in fade-in duration-300">
                                     <div className="flex justify-between items-start">
                                         <div>
                                            <h1 className="text-3xl font-bold font-display text-gray-900 mb-2">{viewedProfile.name}</h1>
                                            <p className="text-slate-600 max-w-2xl leading-relaxed mb-4">{viewedProfile.bio || "This user hasn't written a bio yet."}</p>
                                         </div>
                                         {isOwnProfile && (
                                             <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-brand-primary p-2 bg-slate-50 rounded-full hover:bg-indigo-50 transition-colors">
                                                 <Edit2 size={20} />
                                             </button>
                                         )}
                                     </div>
                                     <div className="flex items-center gap-6 text-sm text-slate-500 mt-2">
                                         <span className="flex items-center gap-1"><User size={14}/> {isOwnProfile ? 'Your Profile' : 'Writer Profile'}</span> 
                                         <span className="font-bold text-gray-900">{viewedProfile.followersCount || 0} <span className="font-normal text-slate-500">Followers</span></span>
                                         <span className="font-bold text-gray-900">{articles.length} <span className="font-normal text-slate-500">Stories</span></span>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-12">
                <h2 className="text-xl font-display font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4">Written Articles</h2>
                <div className="grid gap-6">
                    {articles.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                            <p className="text-gray-500 mb-4">{isOwnProfile ? "You haven't published any stories yet." : `${viewedProfile.name} hasn't published any stories yet.`}</p>
                            {isOwnProfile && <Link to="/write" className="text-brand-primary font-bold hover:underline">Write your first story</Link>}
                        </div>
                    )}
                    {articles.map(article => (
                        <div key={article.$id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
                            {article.coverImage && (
                                <Link to={`/article/${article.$id}`} className="w-full md:w-48 h-32 flex-shrink-0">
                                     <img src={article.coverImage} alt="Cover" className="w-full h-full object-cover rounded-xl" />
                                </Link>
                            )}
                            <div className="flex-1">
                                <Link to={`/article/${article.$id}`} className="group">
                                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-2 group-hover:text-brand-primary transition-colors">{article.title}</h3>
                                    <p className="text-slate-500 mb-4 line-clamp-2">{article.excerpt}</p>
                                </Link>
                                <div className="flex items-center gap-4 text-xs text-slate-400 font-medium uppercase tracking-wide">
                                    <span>{format(new Date(article.$createdAt), 'MMM d, yyyy')}</span>
                                    <span>•</span>
                                    <span>{article.views || 0} views</span>
                                    <span>•</span>
                                    <span>{article.likesCount || 0} likes</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Profile;