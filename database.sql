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
    img BYTEA
);