import React, { useState } from 'react';
import { account, databases, uploadFile, ID, DB_ID, CollectionIDs, base64ToFile } from '../lib/appwrite';
import { generateAvatar } from '../lib/gemini';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowRight, X } from 'lucide-react';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const { refreshProfile } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                await account.createEmailPasswordSession(email, password);
                await refreshProfile();
                navigate('/');
            } else {
                const userId = ID.unique();
                await account.create(userId, email, password, name);
                await account.createEmailPasswordSession(email, password);

                let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
                try {
                   const aiAvatarBase64 = await generateAvatar(name);
                   if (aiAvatarBase64) {
                       const file = base64ToFile(aiAvatarBase64, 'avatar.png');
                       avatarUrl = await uploadFile(file);
                   }
                } catch (err) {
                    console.error("AI Avatar failed, falling back to default", err);
                }

                await databases.createDocument(DB_ID, CollectionIDs.PROFILES, ID.unique(), {
                    userId: userId,
                    name: name,
                    bio: 'Just another storyteller on Pedium.',
                    avatarUrl: avatarUrl,
                    followersCount: 0
                });

                // Create Welcome Notification
                try {
                    await databases.createDocument(DB_ID, CollectionIDs.NOTIFICATIONS, ID.unique(), {
                        userId: userId,
                        type: 'welcome',
                        message: 'Welcome to Pedium! Your account has been successfully created.',
                        link: `/profile/${userId}`,
                        isRead: false
                    });
                } catch (err) {
                    console.error("Failed to create welcome notification", err);
                }

                await refreshProfile();
                navigate('/');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-white dark:bg-[#121212] z-[100] overflow-y-auto transition-colors">
            {/* Close Button */}
            <Link to="/" className="absolute top-8 right-8 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                <X size={24} />
            </Link>

            <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
                <div className="w-full max-w-[400px]">
                    <div className="text-center mb-10">
                        <h1 className="font-serif text-4xl font-normal text-brand-black dark:text-white mb-4">
                            {isLogin ? 'Welcome back.' : 'Join Pedium.'}
                        </h1>
                        <p className="text-brand-black/60 dark:text-gray-400 font-sans text-base">
                            {isLogin ? "Sign in to access your personalized homepage." : "Create an account to start writing and reading."}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border-b border-gray-300 dark:border-gray-700 py-2 focus:outline-none focus:border-black dark:focus:border-white transition-colors bg-transparent placeholder-gray-300 dark:placeholder-gray-600 text-lg font-serif text-black dark:text-white"
                                    required
                                    placeholder="Your Name"
                                />
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border-b border-gray-300 dark:border-gray-700 py-2 focus:outline-none focus:border-black dark:focus:border-white transition-colors bg-transparent placeholder-gray-300 dark:placeholder-gray-600 text-lg font-serif text-black dark:text-white"
                                required
                                placeholder="name@example.com"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border-b border-gray-300 dark:border-gray-700 py-2 focus:outline-none focus:border-black dark:focus:border-white transition-colors bg-transparent placeholder-gray-300 dark:placeholder-gray-600 text-lg font-serif text-black dark:text-white"
                                required
                                minLength={8}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full py-3 mt-8 font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-green-700 dark:text-green-500 hover:text-green-800 text-sm font-bold flex items-center justify-center gap-1 mx-auto"
                        >
                            {isLogin ? "No account? Create one" : "Already have an account? Sign in"} <ArrowRight size={14}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;