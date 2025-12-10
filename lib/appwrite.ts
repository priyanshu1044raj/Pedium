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

export const base64ToFile = (dataUrl: string, filename: string): File => {
    try {
        if (!dataUrl || !dataUrl.includes(',')) return new File([], filename);
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    } catch (e) {
        console.error("Error converting base64 to file", e);
        return new File([], filename);
    }
};

export const uploadFile = async (file: File): Promise<string> => {
    try {
        const result = await storage.createFile(
            BucketIDs.IMAGES,
            ID.unique(),
            file
        );
        const url = storage.getFileView(BucketIDs.IMAGES, result.$id);
        // Return the url directly as it is typed as string
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

export const getFollowers = async (userId: string) => {
    try {
        const res = await databases.listDocuments(DB_ID, CollectionIDs.FOLLOWS, [
            Query.equal('following_id', userId)
        ]);
        return res.documents;
    } catch (e) {
        return [];
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
            
            // Create Notification for the person being followed
            try {
                await databases.createDocument(DB_ID, CollectionIDs.NOTIFICATIONS, ID.unique(), {
                    userId: followingId,
                    type: 'follow',
                    message: `${followerProfile?.name || 'Someone'} started following you`,
                    link: `/profile/${followerId}`
                });
            } catch (notifError) {
                console.error("Failed to create follow notification", notifError);
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
            [Query.orderDesc('$createdAt'), Query.limit(100)]
        );
        
        const lowerTerm = term.toLowerCase();
        const results = response.documents.filter((doc: any) => 
            doc.title.toLowerCase().includes(lowerTerm) || 
            (doc.tags && doc.tags.some((tag: string) => tag.toLowerCase().includes(lowerTerm)))
        );

        return results.slice(0, 5);
    } catch (e) {
        console.error("Search error:", e);
        return [];
    }
};

// Notifications
export const getNotifications = async (userId: string) => {
    try {
        // Guard clause for invalid userId to prevent bad requests
        if (!userId) return [];

        const res = await databases.listDocuments(DB_ID, CollectionIDs.NOTIFICATIONS, [
            Query.equal('userId', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(20)
        ]);
        return res.documents;
    } catch (e) {
        // Completely silent fail for notifications to avoid UI interruption
        return [];
    }
};

export const markNotificationRead = async (notificationId: string) => {
    try {
        await databases.updateDocument(DB_ID, CollectionIDs.NOTIFICATIONS, notificationId, {
            isRead: true
        });
    } catch (e) {}
};

export const markAllNotificationsRead = async (userId: string) => {
    // Client-side optimistic update preferred
};