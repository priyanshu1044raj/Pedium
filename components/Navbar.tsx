import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { client, databases, DB_ID, CollectionIDs, Query } from '../lib/appwrite';
import { PenLine, Bell, Search, Menu, X, User, LogOut, FileText, ChevronDown } from 'lucide-react';
import { Article } from '../types';

const Navbar: React.FC = () => {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    
    // Notification State
    const [notification, setNotification] = useState<{show: boolean, message: string, link: string, avatar: string} | null>(null);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/?q=${encodeURIComponent(searchTerm)}`);
        } else {
            navigate('/');
        }
    };

    // Real-time Notifications Logic
    useEffect(() => {
        if (!user) return;
        let unsubscribe: () => void;
        const setupRealtime = async () => {
            try {
                const follows = await databases.listDocuments(DB_ID, CollectionIDs.FOLLOWS, [
                    Query.equal('follower_id', user.$id)
                ]);
                const followingIds = new Set(follows.documents.map((d: any) => d.following_id));

                unsubscribe = client.subscribe(`databases.${DB_ID}.collections.${CollectionIDs.ARTICLES}.documents`, response => {
                    if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                        const payload = response.payload as Article;
                        if (followingIds.has(payload.authorId)) {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
                            audio.volume = 0.5;
                            audio.play().catch(() => {}); 
                            setNotification({
                                show: true,
                                message: `New story by ${payload.authorName}: "${payload.title}"`,
                                link: `/article/${payload.$id}`,
                                avatar: payload.authorAvatar
                            });
                            setTimeout(() => setNotification(null), 8000);
                        }
                    }
                });
            } catch (error) {
                console.error("Realtime setup failed", error);
            }
        };
        setupRealtime();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [user]);

    return (
        <>
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-8">
                    <div className="flex justify-between items-center h-20">
                        
                        {/* 1. Logo Section */}
                        <div className="flex-shrink-0 flex items-center gap-12">
                            <Link to="/" className="group flex items-center gap-2">
                                <span className="font-serif font-bold text-3xl tracking-tight text-black group-hover:opacity-80 transition-opacity">
                                    Pedium.
                                </span>
                            </Link>
                        </div>
                        
                        {/* 2. Search Bar - Centered Flex Item */}
                        <div className="hidden md:flex flex-1 justify-center max-w-lg mx-8">
                            <form onSubmit={handleSearch} className={`relative w-full transition-all duration-300 ${isSearchFocused ? 'scale-105' : ''}`}>
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search size={16} className={`${isSearchFocused ? 'text-black' : 'text-gray-400'} transition-colors`} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Search stories..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    className="block w-full pl-10 pr-4 py-2.5 border-none rounded-full bg-gray-100 text-sm font-medium text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-200 focus:bg-white transition-all shadow-sm" 
                                />
                            </form>
                        </div>
                        
                        {/* 3. Right Menu */}
                        <div className="flex items-center gap-6 md:gap-8">
                            {/* Desktop Links */}
                            <div className="hidden md:flex items-center gap-6">
                                <Link to="/authors" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
                                    Writers
                                </Link>

                                {user ? (
                                    <>
                                        <Link to="/write" className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors text-sm font-medium">
                                            <PenLine size={18} />
                                            <span>Write</span>
                                        </Link>
                                        
                                        <div className="relative">
                                            <Bell size={20} className="text-gray-600 hover:text-black cursor-pointer transition-colors" />
                                            {notification && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                                        </div>

                                        <div className="relative group h-full flex items-center">
                                            <button className="flex items-center gap-2 focus:outline-none py-2">
                                                <img 
                                                    src={profile?.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} 
                                                    alt="Profile" 
                                                    className="h-9 w-9 rounded-full object-cover border border-gray-200"
                                                />
                                                <ChevronDown size={14} className="text-gray-400 group-hover:text-black transition-colors" />
                                            </button>
                                            
                                            {/* Dropdown */}
                                            <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block animate-fade-in-up">
                                                <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                                                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                                        <p className="text-sm font-bold text-gray-900 truncate font-serif">{user.name}</p>
                                                        <p className="text-xs text-gray-500 truncate font-sans">{user.email}</p>
                                                    </div>
                                                    <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                                        <User size={16}/> Profile
                                                    </Link>
                                                    <Link to="/write" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                                        <FileText size={16}/> Stories
                                                    </Link>
                                                    <div className="border-t border-gray-50 my-1"></div>
                                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                                                        <LogOut size={16}/> Sign out
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Sign In</Link>
                                        <Link to="/register" className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-all">
                                            Get Started
                                        </Link>
                                    </>
                                )}
                            </div>

                            {/* Mobile menu button */}
                            <div className="md:hidden flex items-center">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-black p-1">
                                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-b border-gray-100 px-6 pt-4 pb-8 space-y-6 shadow-xl absolute w-full left-0 top-20 z-50">
                        <form onSubmit={handleSearch} className="relative">
                            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 text-base focus:outline-none focus:ring-1 focus:ring-black" 
                            />
                        </form>
                        <nav className="flex flex-col gap-4">
                            <Link to="/authors" className="text-lg font-serif font-medium text-gray-900" onClick={() => setIsMenuOpen(false)}>Writers</Link>
                            {user ? (
                                <>
                                    <Link to="/profile" className="text-lg font-serif font-medium text-gray-900" onClick={() => setIsMenuOpen(false)}>Profile</Link>
                                    <Link to="/write" className="text-lg font-serif font-medium text-gray-900" onClick={() => setIsMenuOpen(false)}>New Story</Link>
                                    <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="text-lg font-serif font-medium text-red-600 text-left">Sign out</button>
                                </>
                            ) : (
                                <div className="flex flex-col gap-3 pt-4">
                                    <Link to="/login" className="text-center w-full py-3 border border-gray-200 text-gray-900 rounded-full font-medium" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                                    <Link to="/register" className="text-center w-full py-3 bg-black text-white rounded-full font-medium" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                                </div>
                            )}
                        </nav>
                    </div>
                )}
            </nav>

            {/* Premium Notification Toast */}
            {notification && notification.show && (
                <div className="fixed top-24 right-4 md:right-8 z-[100] animate-fade-in-up">
                    <div className="bg-white rounded-lg shadow-2xl p-4 border border-gray-200 w-80 flex gap-4 items-start relative">
                        <img src={notification.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">New Article</p>
                            <p className="text-sm font-serif font-bold text-gray-900 leading-snug mb-2 line-clamp-2">{notification.message}</p>
                            <Link 
                                to={notification.link} 
                                onClick={() => setNotification(null)}
                                className="text-xs font-bold text-black border-b border-black pb-0.5 hover:opacity-70 transition-opacity"
                            >
                                Read Story
                            </Link>
                        </div>
                        <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-black">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;