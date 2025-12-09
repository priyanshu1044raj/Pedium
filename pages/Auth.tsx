import React, { useState } from 'react';
import { account, databases, uploadFile, ID, DB_ID, CollectionIDs } from '../lib/appwrite';
import { generateAvatar } from '../lib/gemini';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowRight } from 'lucide-react';

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
                // Registration
                const userId = ID.unique();
                await account.create(userId, email, password, name);
                
                // Login immediately to create profile
                await account.createEmailPasswordSession(email, password);

                // Generate AI Avatar
                let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
                try {
                   const aiAvatarBase64 = await generateAvatar(name);
                   if (aiAvatarBase64) {
                       const res = await fetch(aiAvatarBase64);
                       const blob = await res.blob();
                       const file = new File([blob], 'avatar.png', { type: 'image/png' });
                       avatarUrl = await uploadFile(file);
                   }
                } catch (err) {
                    console.error("AI Avatar failed, falling back to default", err);
                }

                // Create User Profile in DB
                await databases.createDocument(DB_ID, CollectionIDs.PROFILES, ID.unique(), {
                    userId: userId,
                    name: name,
                    bio: 'Just another storyteller on Pedium.',
                    avatarUrl: avatarUrl,
                    followersCount: 0
                });

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
        <div className="min-h-screen flex bg-white">
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 w-full max-w-[600px] border-r border-gray-100">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div>
                        <Link to="/" className="inline-block mb-8">
                             <h1 className="text-3xl font-display font-bold tracking-tight text-brand-dark">Pedium</h1>
                        </Link>
                        <h2 className="text-3xl font-display font-bold text-gray-900">
                            {isLogin ? 'Welcome back' : 'Start your journey'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {isLogin ? "Enter your details to access your account." : "Join thousands of writers and readers today."}
                        </p>
                    </div>

                    <div className="mt-8">
                        {error && <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {!isLogin && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-all"
                                        required
                                        placeholder="Jane Doe"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-all"
                                    required
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-all"
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-brand-primary/20 text-sm font-bold text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                }}
                                className="text-sm font-medium text-brand-primary hover:text-brand-secondary flex items-center justify-center w-full gap-1"
                            >
                                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"} <ArrowRight size={14}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="hidden lg:block relative w-0 flex-1 bg-brand-dark">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-purple-900 opacity-90"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-12 text-center">
                    <h2 className="text-4xl font-display font-bold mb-6">Unleash your creativity.</h2>
                    <p className="text-lg text-purple-100 max-w-lg">Pedium is a platform for writers, thinkers, and storytellers. Share your ideas with the world.</p>
                </div>
            </div>
        </div>
    );
};

export default Auth;