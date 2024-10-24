CREATE DATABASE pnwsmashdb;

CREATE TABLE forumusers(
    users_id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    last_online TIMESTAMP DEFAULT NOW(),
    is_banned BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    character_name VARCHAR(100) DEFAULT 'Mario',
    selected_skin INTEGER, 

);

CREATE TABLE forumcontent(
    thread_id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content VARCHAR(8000),
    likes INTEGER,
    comments INTEGER,
    username VARCHAR(255),
    postdate TIMESTAMPTZ,
    users_id INT NOT NULL REFERENCES forumusers(users_id)
);

CREATE TABLE forumimages(
    image_id SERIAL PRIMARY KEY,
    filepath TEXT NOT NULL
);

CREATE TABLE forumcomments(
    thread_id INTEGER,
    comment VARCHAR(8000),
    username VARCHAR(16),
    timeposted TIMESTAMPTZ,
    users_id INTEGER,
    comment_id INTEGER,
    is_deleted BOOLEAN

);

CREATE TABLE passwordreset (
  id SERIAL PRIMARY KEY,
  email VARCHAR(50) NOT NULL,
  reset_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false
);

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES forumusers(users_id) NOT NULL,
    receiver_id INT REFERENCES forumusers(users_id) NOT NULL,
    message_text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)

CREATE TABLE friendships (
    friendship_id SERIAL PRIMARY KEY,
    user_id1 INT REFERENCES forumusers(users_id),
    user_id2 INT REFERENCES forumusers(users_id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE userprofiles (
    post_id SERIAL PRIMARY KEY,
    users_id INT REFERENCES forumusers(users_id),
    post_content TEXT,
    profile_image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE likes (
    likes_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES forumusers(users_id),
    post_id INTEGER REFERENCES forumcontent(thread_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dislikes (
    dislikes_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES forumusers(users_id),
    post_id INTEGER REFERENCES forumcontent(thread_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emailverify (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES forumusers(users_id),
    verification_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false
);

CREATE TABLE comment_edits (
    edit_id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL,
    old_content VARCHAR(8000),
    new_content VARCHAR(8000),
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_by INTEGER,
    FOREIGN KEY (comment_id) REFERENCES forumcomments (comment_id),
    FOREIGN KEY (edited_by) REFERENCES forumusers (users_id)
);

CREATE TABLE ban_log (
    id SERIAL PRIMARY KEY,
    users_id INTEGER NOT NULL,
    banned_by INTEGER,
    reason TEXT,
    banned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP ,
    FOREIGN KEY (users_id) REFERENCES forumusers(users_id),
    FOREIGN KEY (banned_by) REFERENCES forumusers(users_id)
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    users_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latest_commenter VARCHAR,
    unique_commenters TEXT,
    message_counter INTEGER DEFAULT 1,
    FOREIGN KEY (users_id) REFERENCES forumusers(users_id),

);

UPDATE forumusers
SET email = 'KrisC@gmail.com'
WHERE users_id = 6;

CREATE TABLE forumuser_public_keys (
    users_id INT PRIMARY KEY,
    public_key TEXT NOT NULL,
    FOREIGN KEY (users_id) REFERENCES forumusers(users_id) ON DELETE CASCADE
);