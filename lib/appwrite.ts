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