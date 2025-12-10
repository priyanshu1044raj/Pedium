import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { searchArticles } from '../lib/appwrite';
import { 
    PenTool, Bell, Search, Menu, X, User, LogOut, FileText, Sun, Moon
} from 'lucide-react';
import { Article } from '../types';

const Navbar: React.FC = () => {
    const { user, profile, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Article[]>([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (searchTerm.length >= 3) {
                const results = await searchArticles(searchTerm);
                setSearchResults(results as unknown as Article[]);
                setShowResults(true);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleSearchSubmit = () => {
        if(searchTerm.trim()) {
            setShowResults(false);
            setIsMenuOpen(false);
            navigate(`/?q=${encodeURIComponent(searchTerm)}`);
        }
    };

    const isHomePage = location.pathname === '/';
    const isTransparent = isHomePage && !scrolled && !user;

    return (
        <nav className={`sticky top-0 z-50 transition-colors duration-300 border-b dark:border-gray-800
            ${isTransparent 
                ? 'bg-brand-yellow border-brand-black dark:bg-[#121212] dark:border-gray-800' 
                : 'bg-white/95 dark:bg-[#121212]/95 backdrop-blur-sm border-gray-100'
            }
        `}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-[75px]">
                    
                    {/* Left: Logo & Search */}
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center gap-0 group">
                            <h1 className={`font-logo font-bold text-3xl tracking-tight ${isTransparent ? 'text-brand-black dark:text-white' : 'text-brand-black dark:text-white'}`}>
                                Pedium
                            </h1>
                        </Link>
                        
                        {/* Search (Desktop) */}
                        <div className="hidden md:block relative" ref={searchRef}>
                            <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 w-64 focus-within:bg-white dark:focus-within:bg-[#1a1a1a] focus-within:border-black dark:focus-within:border-gray-500 focus-within:w-80 transition-all duration-300">
                                <Search 
                                    size={18} 
                                    className="text-gray-400 mr-2 cursor-pointer hover:text-black dark:hover:text-white" 
                                    onClick={handleSearchSubmit}
                                />
                                <input 
                                    type="text" 
                                    placeholder="Search Pedium..." 
                                    className="bg-transparent border-none focus:outline-none text-sm w-full placeholder-gray-400 dark:text-white dark:placeholder-gray-500 font-sans"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={() => { if(searchResults.length > 0) setShowResults(true) }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearchSubmit();
                                    }}
                                />
                            </div>

                            {/* Dropdown Results */}
                            {showResults && (
                                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-[#1E1E1E] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Articles
                                    </div>
                                    {searchResults.length > 0 ? (
                                        searchResults.map(art => (
                                            <Link 
                                                to={`/article/${art.$id}`} 
                                                key={art.$id}
                                                className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                onClick={() => { setShowResults(false); setSearchTerm(''); }}
                                            >
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-200 line-clamp-1 uppercase">{art.title}</div>
                                                <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{art.authorName}</div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-500">No results found.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Right: Actions */}
                    <div className="flex items-center gap-6">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            {theme === 'dark' ? <Sun size={20} className="text-gray-400 dark:text-gray-200"/> : <Moon size={20} className="text-gray-500"/>}
                        </button>

                        {user ? (
                            <>
                                <div className="hidden md:flex items-center gap-6 text-gray-500 dark:text-gray-400">
                                    <Link to="/write" className="flex items-center gap-2 hover:text-black dark:hover:text-white transition-colors text-sm">
                                        <PenTool size={20} />
                                        <span>Write</span>
                                    </Link>
                                    <button className="hover:text-black dark:hover:text-white transition-colors">
                                        <Bell size={22} strokeWidth={1.5} />
                                    </button>
                                    
                                    <div className="relative group">
                                        <button className="block">
                                            <img 
                                                src={profile?.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} 
                                                alt="Profile" 
                                                className="w-9 h-9 rounded-full object-cover cursor-pointer border border-gray-200 dark:border-gray-700"
                                            />
                                        </button>
                                        <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block">
                                            <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-soft-hover border border-gray-100 dark:border-gray-800 py-2">
                                                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">@{user.name.replace(/\s+/g,'').toLowerCase()}</p>
                                                </div>
                                                <Link to="/write" className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800">Write a story</Link>
                                                <Link to={`/profile/${user.$id}`} className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800">Profile</Link>
                                                <Link to="/authors" className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800">Writers</Link>
                                                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 mt-2">Sign out</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                                <Link to="/authors" className="text-brand-black dark:text-gray-300 hover:opacity-80">Our story</Link>
                                <Link to="/write" className="text-brand-black dark:text-gray-300 hover:opacity-80">Write</Link>
                                <Link to="/login" className="text-brand-black dark:text-gray-300 hover:opacity-80">Sign In</Link>
                                <Link to="/register" className={`px-5 py-2.5 rounded-full transition-all text-sm ${isTransparent ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-green-700 text-white hover:bg-green-800'}`}>
                                    Get started
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Toggle */}
                        <div className="md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-black dark:text-white">
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 absolute w-full left-0 z-50 p-4 shadow-xl">
                     <div className="mb-4">
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="w-full bg-gray-100 dark:bg-gray-800 dark:text-white p-2 rounded-lg text-sm mb-2"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSearchSubmit();
                            }}
                        />
                        {showResults && searchResults.length > 0 && (
                            <div className="border rounded-lg bg-white dark:bg-[#1E1E1E] shadow-sm dark:border-gray-700">
                                {searchResults.map(art => (
                                    <Link key={art.$id} to={`/article/${art.$id}`} className="block p-3 text-sm border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setIsMenuOpen(false)}>
                                        <span className="font-bold block text-gray-900 dark:text-gray-200 uppercase">{art.title}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                     </div>

                     {user ? (
                         <div className="space-y-4">
                             <Link to={`/profile/${user.$id}`} className="flex items-center gap-3 text-brand-black dark:text-white" onClick={()=>setIsMenuOpen(false)}>
                                 <User size={20}/> Profile
                             </Link>
                             <Link to="/write" className="flex items-center gap-3 text-brand-black dark:text-white" onClick={()=>setIsMenuOpen(false)}>
                                 <PenTool size={20}/> Write
                             </Link>
                             <button onClick={handleLogout} className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                                 <LogOut size={20}/> Sign Out
                             </button>
                         </div>
                     ) : (
                         <div className="space-y-4 flex flex-col items-start">
                             <Link to="/login" className="text-brand-black dark:text-white font-medium">Sign In</Link>
                             <Link to="/register" className="text-brand-green font-medium">Get Started</Link>
                         </div>
                     )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;