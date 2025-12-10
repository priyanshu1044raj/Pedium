import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';
import { CollectionIDs, BucketIDs } from '../types';

export const PROJECT_ID = "693821ff0038ccf96160";
export const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
export const DB_ID = "pedium_db";

export const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { ID, Query, CollectionIDs, BucketIDs };

export const uploadFile = async (file: File): Promise<string> => {
    try {
        const result = await storage.createFile(
            BucketIDs.IMAGES,
            ID.unique(),
            file
        );
        const url = storage.getFileView(BucketIDs.IMAGES, result.$id);
        return url; 
    } catch (error) {
        console.error("Upload failed", error);
        throw error;
    }
};

export const getProfile = async (userId: string) => {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            CollectionIDs.PROFILES,
            [Query.equal('userId', userId)]
        );
        return response.documents[0];
    } catch (e) {
        console.error("Error fetching profile", e);
        return null;
    }
};

// Follow Logic
export const checkIsFollowing = async (followerId: string, followingId: string) => {
    try {
        const res = await databases.listDocuments(DB_ID, CollectionIDs.FOLLOWS, [
            Query.equal('follower_id', followerId),
            Query.equal('following_id', followingId)
        ]);
        return res.documents.length > 0 ? res.documents[0] : null;
    } catch (e) {
        return null;
    }
};

export const toggleFollow = async (followerId: string, followingId: string) => {
    try {
        const existing = await checkIsFollowing(followerId, followingId);
        
        // Get profiles to update counts (Optimistic updates in UI, but good to have sync)
        const followerProfile = await getProfile(followerId);
        const followingProfile = await getProfile(followingId);

        if (existing) {
            await databases.deleteDocument(DB_ID, CollectionIDs.FOLLOWS, existing.$id);
            // Decrement
            if (followingProfile) {
                 await databases.updateDocument(DB_ID, CollectionIDs.PROFILES, followingProfile.$id, {
                     followersCount: Math.max(0, (followingProfile.followersCount || 0) - 1)
                 });
            }
            return false;
        } else {
            await databases.createDocument(DB_ID, CollectionIDs.FOLLOWS, ID.unique(), {
                follower_id: followerId,
                following_id: followingId
            });
            // Increment
             if (followingProfile) {
                 await databases.updateDocument(DB_ID, CollectionIDs.PROFILES, followingProfile.$id, {
                     followersCount: (followingProfile.followersCount || 0) + 1
                 });
            }
            return true;
        }
    } catch (e) {
        console.error("Follow toggle error", e);
        throw e;
    }
};

export const searchArticles = async (term: string) => {
    if (!term || term.length < 2) return [];
    try {
        const response = await databases.listDocuments(
            DB_ID,
            CollectionIDs.ARTICLES,
            [Query.search('title', term), Query.limit(5)]
        );
        return response.documents;
    } catch (e) {
        console.error("Search error (Ensure 'title' FullText index exists):", e);
        return [];
    }
};