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