export interface UserProfile {
  $id: string;
  userId: string;
  name: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
}

export interface Article {
  $id: string;
  title: string;
  content: string; // JSON string from Editor.js
  coverImage: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  excerpt: string;
  summary?: string; // AI Generated summary
  views: number;
  likesCount: number;
  $createdAt: string;
  tags: string[];
}

export interface Comment {
  $id: string;
  articleId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  $createdAt: string;
}

export interface Notification {
    $id: string;
    userId: string;
    type: 'new_article' | 'follow';
    message: string;
    link: string;
    isRead: boolean;
    $createdAt: string;
}

export enum CollectionIDs {
  PROFILES = 'profiles',
  ARTICLES = 'articles',
  COMMENTS = 'comments',
  LIKES = 'likes',
  FOLLOWS = 'follows',
  NOTIFICATIONS = 'notifications'
}

export enum BucketIDs {
  IMAGES = 'images'
}