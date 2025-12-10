# Appwrite Setup Guide for Pedium

## 1. Project Setup
1.  Log in to [Appwrite Console](https://cloud.appwrite.io).
2.  Create a project named **Pedium**.
3.  Note your `Project ID`. It should match the one in `lib/appwrite.ts`.

## 2. Enable Authentication
1.  Navigate to **Auth** > **Settings**.
2.  Toggle **Email/Password** to **Enabled**.

## 3. Storage (Buckets) - CRITICAL FOR IMAGES
1.  Navigate to **Storage** in the left sidebar.
2.  Click **Create Bucket**.
3.  **Name:** `Images`
4.  **Bucket ID:** `images` (You must click the "edit" icon next to the ID field to set this manually to `images`. If you leave it auto-generated, the code will fail).
5.  Click **Create**.
6.  **Permissions:**
    *   Click on the `Images` bucket you just created.
    *   Go to the **Settings** tab.
    *   Scroll to **Permissions**.
    *   Click **+ Add Role**.
    *   Select **Any** and check **Read**. (This allows images to be seen by the public).
    *   Click **+ Add Role**.
    *   Select **Users** and check **Create**, **Update**, **Delete**. (This allows logged-in users to upload).
    *   Click **Update**.

## 4. Database Setup
1.  Navigate to **Databases**.
2.  Create a database named `Pedium DB` with ID `pedium_db`.

### Create Collections
Create the following collections inside `Pedium DB`.

#### Collection: `profiles`
*   **ID:** `profiles`
*   **Permissions:** `Any` (Read), `Users` (Create), `Users` (Update), `Users` (Delete).
*   **Attributes:**
    *   `userId`: String (50)
    *   `name`: String (100)
    *   `bio`: String (1000)
    *   `avatarUrl`: Url
    *   `followersCount`: Integer (Default: 0)

#### Collection: `articles`
*   **ID:** `articles`
*   **Permissions:** `Any` (Read), `Users` (Create), `Users` (Update), `Users` (Delete).
*   **Attributes:**
    *   `title`: String (255)
    *   `content`: String (Size: 1000000) - *Note: Large size for JSON content.*
    *   `coverImage`: Url (Nullable)
    *   `authorId`: String (50)
    *   `authorName`: String (100)
    *   `authorAvatar`: Url
    *   `excerpt`: String (500)
    *   `summary`: String (500)  <-- NEW ATTRIBUTE
    *   `views`: Integer (Default: 0)
    *   `likesCount`: Integer (Default: 0)
    *   `tags`: String Array (Size: 50)
*   **Indexes:**
    *   Key: `created_at_index`, Type: `Key`, Attribute: `$createdAt`, Order: `DESC`.
    *   Key: `search_index`, Type: `FullText`, Attribute: `title`. (Required for Search)

#### Collection: `comments`
*   **ID:** `comments`
*   **Permissions:** `Any` (Read), `Users` (Create), `Users` (Delete).
*   **Attributes:**
    *   `articleId`: String (50)
    *   `userId`: String (50)
    *   `userName`: String (100)
    *   `userAvatar`: Url
    *   `content`: String (2000)
*   **Indexes:**
    *   Key: `article_index`, Type: `Key`, Attribute: `articleId`.

#### Collection: `likes`
*   **ID:** `likes`
*   **Permissions:** `Users` (Read, Create, Delete).
*   **Attributes:**
    *   `articleId`: String (50)
    *   `userId`: String (50)
*   **Indexes:**
    *   Key: `unique_like`, Type: `Unique`, Attributes: `articleId`, `userId`.

#### Collection: `follows`
*   **ID:** `follows`
*   **Permissions:** `Users` (Read, Create, Delete).
*   **Attributes:**
    *   `follower_id`: String (50)
    *   `following_id`: String (50)

#### Collection: `notifications`
*   **ID:** `notifications`
*   **Permissions:** `Users` (Read, Create, Update, Delete).
*   **Attributes:**
    *   `userId`: String (50)
    *   `type`: String (50) (e.g., 'new_article', 'follow')
    *   `message`: String (255)
    *   `link`: String (255)
    *   `isRead`: Boolean (Default: false)
*   **Indexes:**
    *   Key: `user_notifs`, Type: `Key`, Attribute: `userId`, Order: `DESC`.