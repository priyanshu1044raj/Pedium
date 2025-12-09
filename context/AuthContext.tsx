import React, { createContext, useContext, useEffect, useState } from 'react';
import { account, getProfile } from '../lib/appwrite';
import { UserProfile } from '../types';
import { Models } from 'appwrite';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    profile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const checkUser = async () => {
        try {
            const currentUser = await account.get();
            setUser(currentUser);
            const userProfile = await getProfile(currentUser.$id);
            setProfile(userProfile as unknown as UserProfile);
        } catch (error) {
            setUser(null);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUser();
    }, []);

    const logout = async () => {
        try {
            await account.deleteSession('current');
        } catch (e) {
            console.error(e);
        }
        setUser(null);
        setProfile(null);
    };
    
    const refreshProfile = async () => {
        if(user) {
             const userProfile = await getProfile(user.$id);
             setProfile(userProfile as unknown as UserProfile);
        } else {
             await checkUser();
        }
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};