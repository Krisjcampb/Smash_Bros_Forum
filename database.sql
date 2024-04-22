CREATE DATABASE pnwsmashdb;

CREATE TABLE forumusers(
    users_id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255)
);

CREATE TABLE forumcontent(
    thread_id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content VARCHAR(8000),
    likes INTEGER,
    comments INTEGER,
    username VARCHAR(255),
    postdate TIMESTAMP
);

CREATE TABLE forumimages(
    image_id SERIAL PRIMARY KEY,
    filepath TEXT NOT NULL
);

CREATE TABLE forumcomments(
    thread_id INTEGER,
    comment VARCHAR(8000),
    username VARCHAR(16),
    timeposted TIMESTAMP
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