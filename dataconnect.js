const express = require("express");
const app = express();
const dotenv = require("dotenv")
dotenv.config();
const cors = require("cors");
const pool = require("./db");
const multer = require('multer');
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const crypto = require("crypto")
const bcrypt = require("bcrypt")
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);  // Create an HTTP server

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

//storage
const Storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
})
const upload = multer({ 
    storage: Storage 
})

//middleware
app.use(cors());
app.use(express.json()); //req.body
app.use('/public/uploads', express.static('public/uploads'))


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error(err)
            return res.sendStatus(403)
        }
        req.user = user
        next();
    })

}
//ROUTES//

//USERS ACCOUNT

//create a user
app.post('/forumusers', async (req, res) => {
    try {
        const { username, email, hashedpassword, publicKey } = req.body;

        // Insert user into forumusers table
        const newForumusers = await pool.query(
            "INSERT INTO forumusers (username, email, password) VALUES ($1, $2, $3) RETURNING *", 
            [username, email, hashedpassword]
        );

        const userId = newForumusers.rows[0].users_id;

        // Generate a random verification code
        const generateRandomCode = () => {
            const buffer = crypto.randomBytes(3);
            const code = buffer.readUIntBE(0, 3);
            return code % 1000000;
        };
        const randomcode = generateRandomCode();

        // Set expiration time for the verification code
        const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Insert verification code into emailverify table
        await pool.query('INSERT INTO emailverify (user_id, verification_code, expires_at, verified) VALUES ($1, $2, $3, $4)', [userId, randomcode, expires_at, false]);

        // Send verification email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            secure: false,
            auth: {
                user: 'pnwsmashhub@gmail.com',
                pass: process.env.EMAIL_APP_PASS,
            },
        });

        const mailOptions = {
            from: 'pnwsmashhub@gmail.com',
            to: email,
            subject: 'Verify your email address',
            text: `Your verification code is: ${randomcode}. This code is valid for 24 hours.`,
        };

        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.error('Error sending email:', err);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        res.status(201).json({ user: newForumusers.rows[0], message: 'User registered successfully' });

    } catch (err) {
        console.error('Error in /forumusers endpoint:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put("/forumusers/updateVerified", async (req, res) => {
    try{
        const { email } = req.body;
        const updateQuery = `
            UPDATE forumusers
            SET verified = TRUE
            WHERE email = $1;
        `;
        await pool.query(updateQuery, [email]);
        res.status(201).send("User email verified");
    } catch {
        console.error(err.message);
        res.status(500).send("Internal server error");
    }
})
app.post("/forumusers/savePublicKey", async (req, res) => {
    try {
        const { email, publicKey } = req.body;
        const userQuery = await pool.query("SELECT users_id FROM forumusers WHERE email = $1", [email]);
        const userId = userQuery.rows[0].users_id;

        const keyQuery = `
            INSERT INTO forumuser_public_keys (users_id, public_key)
            VALUES ($1, $2);`;

        await pool.query(keyQuery, [userId, publicKey]);
        res.status(201).send("Public key saved successfully");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

//user sign in
app.post('/userlogin', async (req, res) => {
    const {email, password} = req.body;
    try{
        const user = await pool.query('SELECT * FROM forumusers WHERE email = $1', [email])
        if(!user || user.rows[0] === undefined) 
        {
            return res.json({ success: false })
        }
        else{
            bcrypt.compare(password, user.rows[0].password, function(err, response) {
            if(err){
                console.log(err)
            }
            else if(response){
                console.log(response)
                const token = jwt.sign({users_id: user.rows[0].users_id, username: user.rows[0].username}, process.env.JWT_SECRET)
                res.json({ success: true, token: token });
            }
            else{
                res.json({success: false})
            }
        })
        }

    }catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
})

//user authentication
app.get('/userauthenticate', authenticateToken, (req, res) => {
    pool.query(`UPDATE forumusers SET last_online = NOW() WHERE users_id = $1`, [req.user.users_id]);
    pool.query('SELECT username, users_id, role, location, description, last_online FROM forumusers WHERE users_id = $1', [req.user.users_id], (err, result) =>{
        if (err) {
            console.error(err)
            res.sendStatus(500);
        } else if (result.rows.length === 0) {
            // console.log(req.user.users_id)
            res.sendStatus(404);
        } else {
            res.json({name: result.rows[0].username, id: result.rows[0].users_id, role: result.rows[0].role, location: result.rows[0].location, description: result.rows[0].description, last_online: result.rows[0].last_online});
        }
    })
})

//get all forum users
app.get("/forumusers", async(req, res) => {
    try{
        const allUsers = await pool.query("SELECT * FROM forumusers")
        res.json(allUsers.rows);
    }
    catch (err) {
        console.error(err.message)
    }
})

//get a forum user by id
app.get("/forumusers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log("ID: ", id);

        const forumusers = await pool.query("SELECT * FROM forumusers WHERE users_id = $1", [id]);

        if (forumusers.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = forumusers.rows[0];
        res.json({
            name: user.username,
            id: user.users_id,
            role: user.role,
            location: user.location,
            description: user.description,
            last_online: user.last_online,
        });
    } catch (err) {
        console.error("Error fetching forum user:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//get a forum user by name
app.get("/forumusers/get-user/:username", async (req, res) => {
    try {
        const { username } = req.params;
        console.log("Username: ", username);

        const forumusers = await pool.query(
            "SELECT * FROM forumusers WHERE username ILIKE $1 ORDER BY username LIMIT 6",
            [`${username}%`]
        );

        const users = forumusers.rows.map(user => ({
            name: user.username,
            id: user.users_id,
            role: user.role,
            character_name: user.character_name,
            selected_skin: user.selected_skin,
            location: user.location,
            description: user.description,
            last_online: user.last_online
        }));

        res.json(users);
    } catch (err) {
        console.error("Error fetching forum users by username:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//updating email code
app.put("/resendcode", async (req, res) => {
    const { email } = req.body;

    try {
        const userQuery = 'SELECT users_id FROM forumusers WHERE email = $1';
        const userResult = await pool.query(userQuery, [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const generateRandomCode = () => {
        const buffer = crypto.randomBytes(3);
        const code = buffer.readUIntBE(0, 3);
        return code % 1000000;
        }
        const userId = userResult.rows[0].users_id;

        const randomcode = generateRandomCode();
        const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const updateQuery = `
            UPDATE emailverify
            SET verification_code = $1, expires_at = $2
            WHERE user_id = $3;
        `;
        await pool.query(updateQuery, [randomcode, expires_at, userId]);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            secure: false,
            auth: {
                user: "smashpointssb@gmail.com",
                pass: process.env.EMAIL_APP_PASS
            },
        });
        
        const mailOptions = {
            from: 'pnwsmashhub@gmail.com',
            to: email,
            subject: 'Verify your email address',
            text: `Your verification code is: ${randomcode}. This code is valid for 24 hours.`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating verification code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//update a forum user
app.put("/forumusers", async (req, res) => {
    try {
        const {hashedpassword, email} = req.body;
        const updateForumusers = await pool.query("UPDATE forumusers SET password = $1 WHERE email = $2",
        [hashedpassword, email]
        );

        res.json("Forumusers was updated!");
    } catch (err) {
        console.error(err.message)
    }
}) 

app.put("/forumrole", async (req, res) => {
    try{
        const {selectedRole, selectedId} = req.body;
        console.log(selectedRole, selectedId)
        await pool.query(`UPDATE forumusers SET role = $1 WHERE users_id = $2`, [selectedRole, selectedId]);
        
        res.json("Forum role was updated!");   
    } catch (err) {
        console.error(err.message)
    }
})


//ban a user
app.delete("/forumusers/:userId", async (req, res) =>{
    try {
        const { userId } = req.params;
        const { banReason, commentId, banDuration } = req.body;

        let unbanDate = null;

        if (banDuration !== -1) {
            const currentDate = new Date();
            unbanDate = new Date(currentDate.setDate(currentDate.getDate() + parseInt(banDuration)));
        }

        const updateBanLog = await pool.query('INSERT INTO ban_log (users_id, banned_by, reason, expires_at) VALUES($1, $2, $3, $4)', [commentId, userId, banReason, unbanDate])

        const banForumuser = await pool.query('UPDATE forumusers SET is_banned = $1 WHERE users_id = $2', [true, commentId]);
        res.json('User has been banned successfully!');
    } catch (err) {
        console.log(err.message);
    }
});

/////////////////////////////////// FORUM IMAGES //////////////////////////////////////

app.post('/forumimages', upload.single('image'), (req, res) => {
    const {path} = req.file;
    const {thread_id} = req.body;

    if(!thread_id){
        return res.status(400).send('thread_id is required');
    }

    console.log(req.file)
    pool.query(
      'INSERT INTO forumimages (filepath, thread_id) VALUES ($1, $2)',
      [path.replaceAll('\\', '/'), thread_id],
      (error, results) => {
        if (error) {
          console.log(error)
          res.sendStatus(500)
        } else {
          res.send('File uploaded successfully')
        }
      }
    )
})

//get all forum images

app.get('/forumimages', async (req, res) => {
  try {
    const allForumimages = await pool.query('SELECT * FROM forumimages')
    res.json(allForumimages.rows)
  } catch (err) {
    console.error(err.message)
  }
})

app.get('/forumimage')

app.get('/getProfilePictures', (req, res) => {
    const fs = require('fs');
    const path = require('path');

    const directoryPath = path.join(__dirname, 'path/to/your/images');
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan directory');
        }
        res.json(files);
    });
});

app.post('/saveProfilePicture', (req, res) => {
    const { userId, selectedImage } = req.body;

    db.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [selectedImage, userId], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(200).send('Profile picture updated successfully');
    });
});
/////////////////////////////////// FORUM CONTENT //////////////////////////////////////

app.post('/forumcontent', async (req, res) => {
  try {
    const {title, content, likes, comments, username, postdate, usersId} = req.body
    const newForumcontent = await pool.query(
      "INSERT INTO forumcontent (title, content, likes, comments, username, postdate, users_id) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [title, content, likes, comments, username, postdate, usersId]
    );
    console.log(newForumcontent.rows[0])
    res.json(newForumcontent.rows[0])
    
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error');
  }
})

//get all forum threads
// app.get('/forumcontent', async (req, res) => {
//   try {
//     const allForumcontent = await pool.query(`
//       SELECT fc.*
//       FROM forumcontent fc
//       JOIN forumusers fu ON fc.users_id = fu.users_id
//       WHERE fu.is_banned = FALSE
//     `);
//     res.json(allForumcontent.rows);
//   } catch (err) {
//     console.error(err.message);
//   }
// });

app.get('/forumcontent', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const offset = (page - 1) * limit;

    const paginatedQuery = `
      SELECT fc.*, fi.filepath
      FROM forumcontent fc
      LEFT JOIN forumimages fi ON fc.thread_id = fi.thread_id
      JOIN forumusers fu ON fc.users_id = fu.users_id
      WHERE fu.is_banned = FALSE
      ORDER BY fc.postdate DESC
      LIMIT $1 OFFSET $2
    `;

    const allForumcontent = await pool.query(paginatedQuery, [limit, offset]);

    res.json(allForumcontent.rows);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
});

//get a forum thread
app.get('/forumcontent/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params;
    const query = `
      SELECT fc.*, fu.username, fi.filepath
      FROM forumcontent fc
      JOIN forumusers fu ON fc.users_id = fu.users_id
      LEFT JOIN forumimages fi ON fc.thread_id = fi.thread_id
      WHERE fc.thread_id = $1
    `;
    const result = await pool.query(query, [thread_id]);
    if (result.rows.length === 0) return res.sendStatus(404);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
});

//update a forum thread
app.put('/forumcontent/:thread_id', async (req, res) => {
    const client = await pool.connect();

    try {
        const { thread_id } = req.params;
        const { content, title } = req.body;

        threadQuery = await pool.query('SELECT * FROM forumcontent WHERE thread_id = $1', [thread_id])
        const thread = threadQuery.rows[0];

        const postdate = new Date(thread.postdate);
        const currentTime = new Date();

        const timeDiff = currentTime - postdate;
        const timeDiffInHours = timeDiff / (1000 * 60 * 60);
        console.log("Thread date: ", thread.postdate, "Time in hours: ", timeDiffInHours)
        
        console.log(`Updating thread ${thread_id} with title: ${title}`);

        await client.query('BEGIN');

        const updateForumContent = 'UPDATE forumcontent SET title = $1, content = $2 WHERE thread_id = $3';
        await client.query(updateForumContent, [title, content, thread_id]);

        await client.query('COMMIT');
        
        res.json('Forum content was updated!');
    } catch (err) {
        console.error('Error updating forum content:', err.message);

        try {
        await client.query('ROLLBACK');
        } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError.message);
        }

        res.status(500).send('Server error');
    } finally {
        client.release();
    }
});

app.get('/forumuserposts/:friendid', async (req, res) => {
    try {
        const { friendid } = req.params;
        console.log("User ID for forumcontent: ", friendid)
        postQuery = await pool.query('SELECT * FROM forumcontent WHERE users_id = $1', [friendid]);
        res.json(postQuery.rows)
    } catch(err) {
        console.error(err.message);
    }
})

//delete a forum thread
app.delete('/forumcontent/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deleteForumcontent = await pool.query(
      'DELETE FROM forumcontent WHERE thread_id = $1',
      [id]
    )
    res.json('Forumcontent was deleted!')
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/threadcontent/:userid', async (req, res) => {
    try {
        const { userid } = req.params;

        const getThreadContent = await pool.query(`
            SELECT DISTINCT fc.thread_id, fc.title, fc.content, fc.postdate, fi.filepath
            FROM forumcontent fc
            INNER JOIN forumcomments fcm ON fc.thread_id = fcm.thread_id
            LEFT JOIN forumimages fi ON fi.thread_id = fc.thread_id
            WHERE fcm.users_id = $1
            ORDER BY fc.postdate DESC;
        `, [userid]);

        res.json(getThreadContent.rows);
    } catch (error) {
        console.error('Error getting thread content:', error);
        res.status(500).json({ error: 'An error occurred while getting the thread content.' });
    }
});

//FORUM CONTENT LIKES AND DISLIKES
app.post('/forumlikes', async (req, res) => {
    const {userid, thread_id} = req.body

    try {
        const like = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND post_id = $2', [userid, thread_id]);

        if (like.rows.length > 0) {
            await pool.query(`DELETE FROM likes WHERE user_id = $1 AND post_id = $2`, [userid, thread_id])
            return res.status(200).send('Like removed');
        }

        const dislike = await pool.query('SELECT * FROM dislikes WHERE user_id = $1 AND post_id = $2', [userid, thread_id]);

        if (dislike.rows.length > 0) {
            await pool.query(`DELETE FROM dislikes WHERE user_id = $1 AND post_id = $2`, [userid, thread_id])
        }

        await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userid, thread_id]);
        res.status(200).json({ message: 'Post liked successfully.' });
    }
    catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'An error occurred while liking the post.' });
    }
})

app.post('/forumdislikes', async (req, res) => {
    const { userid, thread_id} = req.body;

    try {
        const dislike = await pool.query('SELECT * FROM dislikes WHERE user_id = $1 AND post_id = $2', [userid, thread_id]);

        if (dislike.rows.length > 0) {
            await pool.query(`DELETE FROM dislikes WHERE user_id = $1 AND post_id = $2`, [userid, thread_id])
            return res.status(200).send('Dislike removed');
        }

        const like = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND post_id = $2', [userid, thread_id]);

        if (like.rows.length > 0) {
            await pool.query(`DELETE FROM likes WHERE user_id = $1 AND post_id = $2`, [userid, thread_id])
        }

        await pool.query('INSERT INTO dislikes (user_id, post_id) VALUES ($1, $2)', [userid, thread_id]);

        res.status(200).json({ message: 'Post disliked successfully.' });
    } catch (error) {
        console.error('Error disliking post:', error);
        res.status(500).json({ error: 'An error occurred while disliking the post.' });
    }

})

app.get('/forumlikes', async (req, res) => {
    try {
        const likes = await pool.query(
        `SELECT post_id, COUNT(*) AS like_count
        FROM likes
        GROUP BY post_id;
        `)
        const result = likes.rows;

        res.json(result)

    } catch (err) {
        console.error(err.message)
    }
})

app.get('/forumdislikes', async (req, res) => {
    try {
        const dislikes = await pool.query(
        `SELECT post_id, COUNT(*) AS dislike_count
        FROM dislikes
        GROUP BY post_id;
        `)
        const result = dislikes.rows;

        res.json(result)

    } catch (err) {
        console.error(err.message)
    }
})

app.get('/userlikesdislikes', async (req, res) => {

    const userid = req.query.userid;
    try {
        const likes = await pool.query(`SELECT post_id FROM likes WHERE user_id = $1`, [userid])
        const dislikes = await pool.query(`SELECT post_id FROM dislikes WHERE user_id = $1`, [userid])

        const result = [
            ...likes.rows.map(like => ({ thread_id: like.post_id, type: 'like' })),
            ...dislikes.rows.map(dislike => ({ thread_id: dislike.post_id, type: 'dislike' }))
        ];
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

//////////////////////////////// FORUM COMMENTS ////////////////////////////////////////

app.post('/forumcomments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const validateId = (id, name) => {
      const num = Number(id);
      if (isNaN(num)) throw new Error(`Invalid ${name}: ${id}`);
      return num;
    };

    const { thread_id, comment, user, userid, mentions = [] } = req.body;
    const validThreadId = validateId(thread_id, 'thread_id');
    const validUserId = validateId(userid, 'userid');

    const newComment = await client.query(
      `INSERT INTO forumcomments 
       (thread_id, comment, username, timeposted, users_id, mentions) 
       VALUES($1, $2, $3, NOW(), $4, $5) 
       RETURNING *`,
      [validThreadId, comment, user, validUserId, JSON.stringify(mentions)]
    );

    const threadResult = await client.query(
      'SELECT title, users_id FROM forumcontent WHERE thread_id = $1',
      [validThreadId]
    );
    const threadTitle = threadResult.rows[0]?.title || 'a thread';
    const threadCreatorId = threadResult.rows[0]?.users_id;

    const mentionedUsers = new Set();

    if (mentions.length > 0) {
      for (const { username } of mentions) {
        const userResult = await client.query(
          'SELECT users_id FROM forumusers WHERE username = $1',
          [username]
        );

        if (userResult.rows[0]?.users_id) {
          const mentionedUserId = validateId(userResult.rows[0].users_id, 'mentionedUserId');

          if (mentionedUserId !== validUserId && !mentionedUsers.has(mentionedUserId)) {
            mentionedUsers.add(mentionedUserId);

            const existingMention = await client.query(
              `SELECT notification_id, unique_commenters 
               FROM notifications 
               WHERE users_id = $1 AND type = 'mention' AND thread_id = $2`,
              [mentionedUserId, validThreadId]
            );

            if (existingMention.rows.length > 0) {
              const existing = existingMention.rows[0];
              let mentioners = existing.unique_commenters 
                ? JSON.parse(existing.unique_commenters) 
                : [];

              if (!mentioners.includes(validUserId)) {
                mentioners.push(validUserId);
              }

              await client.query(
                `UPDATE notifications SET
                 message = $1,
                 unique_commenters = $2,
                 message_count = $3,
                 latest_commenter = $4,
                 is_read = FALSE,
                 created_at = NOW()
                 WHERE notification_id = $5`,
                [
                  mentioners.length > 1 
                    ? `${user} and ${mentioners.length - 1} others mentioned you in "${threadTitle}"`
                    : `${user} mentioned you in "${threadTitle}"`,
                  JSON.stringify(mentioners),
                  mentioners.length,
                  user,
                  existing.notification_id
                ]
              );
            } else {
              await client.query(
                `INSERT INTO notifications 
                 (users_id, type, entity_id, message, thread_id, 
                  unique_commenters, message_count, latest_commenter) 
                 VALUES ($1, 'mention', $2, $3, $4, $5, 1, $6)`,
                [
                  mentionedUserId,
                  validUserId,
                  `${user} mentioned you in "${threadTitle}"`,
                  validThreadId,
                  JSON.stringify([validUserId]),
                  user
                ]
              );
            }
          }
        }
      }
    }

    if (threadCreatorId && threadCreatorId !== validUserId && !mentionedUsers.has(threadCreatorId)) {
      const existingNotification = await client.query(
        `SELECT notification_id, unique_commenters 
         FROM notifications 
         WHERE users_id = $1 AND type = 'comment' AND entity_id = $2`,
        [threadCreatorId, validThreadId]
      );

      if (existingNotification.rows.length > 0) {
        const notification = existingNotification.rows[0];
        let uniqueCommenters = notification.unique_commenters 
          ? JSON.parse(notification.unique_commenters) 
          : [];

        if (!uniqueCommenters.includes(validUserId)) {
          uniqueCommenters.push(validUserId);
        }

        await client.query(
          `UPDATE notifications SET
           message = $1,
           is_read = FALSE,
           latest_commenter = $2,
           unique_commenters = $3,
           message_count = $4,
           thread_id = $5,
           created_at = NOW()
           WHERE notification_id = $6`,
          [
            uniqueCommenters.length > 1 
              ? `${user} and ${uniqueCommenters.length - 1} others commented on your thread` 
              : `${user} commented on your thread`,
            user,
            JSON.stringify(uniqueCommenters),
            uniqueCommenters.length,
            validThreadId,
            notification.notification_id
          ]
        );
      } else {
        await client.query(
          `INSERT INTO notifications 
           (users_id, type, entity_id, message, latest_commenter, 
            unique_commenters, message_count, thread_id) 
           VALUES ($1, 'comment', $2, $3, $4, $5, 1, $6)`,
          [
            threadCreatorId,
            validThreadId,
            `${user} commented on your thread`,
            user,
            JSON.stringify([validUserId]),
            validThreadId
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      comment_id: newComment.rows[0].comment_id,
      mentions_processed: mentionedUsers.size
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Forum Comment Error]', err.message);
    res.status(500).json({
      error: 'Failed to post comment',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    client.release();
  }
});

//get forumcomments
app.get('/forumcomments/:thread_id', async (req, res) => {
    try {
        const { thread_id } = req.params;
        const result = await pool.query(
        `SELECT 
            fc.*,
            fu.character_name,
            fu.selected_skin,
            fu.role,
            CASE 
            WHEN fc.mentions IS NULL THEN '[]'::jsonb 
            ELSE fc.mentions 
            END AS mentions
        FROM forumcomments fc
        JOIN forumusers fu ON fc.users_id = fu.users_id
        WHERE fc.thread_id = $1
            AND fc.is_deleted = FALSE
            AND (fu.is_banned IS NULL OR fu.is_banned = FALSE)
        ORDER BY fc.timeposted DESC`,
        [thread_id]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Database error:', err.message);
        res.status(500).json({ 
        error: 'Failed to fetch comments',
        details: err.message 
        });
    }
});

app.get('/usercomments/:userid', async (req, res) => {
    try {
        const {userid} = req.params
        const usercomments = await pool.query(
          `SELECT * FROM forumcomments WHERE users_id = $1 AND is_deleted = FALSE ORDER BY timeposted DESC`, [userid]
        )
        res.json(usercomments.rows)
    } catch (err) {
        console.error(err.message)
    }
})

app.put('/forumcomments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, userId } = req.body;

    await pool.query('BEGIN');

    const getOldContentQuery = 'SELECT comment FROM forumcomments WHERE comment_id = $1';
    const oldContentResult = await pool.query(getOldContentQuery, [commentId]);
    const oldContent = oldContentResult.rows[0].comment;

    const insertEditHistoryQuery = `
      INSERT INTO comment_edits (comment_id, old_content, new_content, edited_by)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(insertEditHistoryQuery, [commentId, oldContent, content, userId]);

    const updateCommentQuery = 'UPDATE forumcomments SET comment = $1 WHERE comment_id = $2';
    await pool.query(updateCommentQuery, [content, commentId]);

    await pool.query('COMMIT');

    res.json('Comment was updated and history recorded!');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

app.delete('/forumcomments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params
    const deleteForumucontent = await pool.query(
      'UPDATE forumcomments SET is_deleted = True WHERE comment_id = $1',
      [commentId]
    )

    res.json('Comment was deleted!')
  } catch (err) {
    console.error(err.message)
  }
})

app.get('/edithistory/:commentId', async(req, res) => {
    try {
        const { commentId } = req.params
const edithistory = await pool.query(
            `SELECT ce.old_content, ce.new_content, u.username AS edited_by, 
                    TO_CHAR(ce.edited_at, 'YYYY-MM-DD HH24:MI:SS') AS edit_timestamp 
             FROM comment_edits ce
             JOIN forumusers u ON ce.edited_by = u.users_id
             WHERE ce.comment_id = $1
             ORDER BY ce.edited_at DESC`, [commentId]
        );
        console.log(edithistory)
        res.json(edithistory.rows)
    } catch(err){
        console.error(err.message)
    }
})
server.listen(5000, () => {
    console.log("server has started on port 5000");

});

//FORUM COMMENT LIKES AND DISLIKES
app.post('/commentlikes', async (req, res) => {
    const {userId, comment_id} = req.body
    try {
        const like = await pool.query('SELECT * FROM commentlikes WHERE user_id = $1 AND comment_id = $2', [userId, comment_id]);

        if (like.rows.length > 0) {
            await pool.query(`DELETE FROM commentlikes WHERE user_id = $1 AND comment_id = $2`, [userId, comment_id])
            return res.status(200).send('Like removed');
        }

        const dislike = await pool.query('SELECT * FROM commentdislikes WHERE user_id = $1 AND comment_id = $2', [userId, comment_id]);

        if (dislike.rows.length > 0) {
            await pool.query(`DELETE FROM commentdislikes WHERE user_id = $1 AND comment_id = $2`, [userId, comment_id])
        }

        await pool.query('INSERT INTO commentlikes (user_id, comment_id) VALUES ($1, $2)', [userId, comment_id]);

        res.status(200).json({ message: 'Post liked successfully.' });
    }
    catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'An error occurred while liking the post.' });
    }
})

app.post('/commentdislikes', async (req, res) => {
    const { userId, comment_id} = req.body;

    try {
        const dislike = await pool.query('SELECT * FROM commentdislikes WHERE user_id = $1 AND comment_id = $2', [userId, comment_id]);

        if (dislike.rows.length > 0) {
            await pool.query(`DELETE FROM commentdislikes WHERE user_id = $1 AND comment_id = $2`, [userId, comment_id])
            return res.status(200).send('Dislike removed');
        }

        const like = await pool.query('SELECT * FROM commentlikes WHERE user_id = $1 AND comment_id = $2', [userId, comment_id]);

        if (like.rows.length > 0) {
            await pool.query(`DELETE FROM commentlikes WHERE user_id = $1 AND comment_id = $2`, [userId, comment_id])
        }

        await pool.query('INSERT INTO commentdislikes (user_id, comment_id) VALUES ($1, $2)', [userId, comment_id]);

        res.status(200).json({ message: 'Post disliked successfully.' });
    } 
    catch (error) {
        console.error('Error disliking post:', error);
        res.status(500).json({ error: 'An error occurred while disliking the post.' });
    }

})

app.get('/commentlikes', async (req, res) => {
    try {
        const likes = await pool.query(
        `SELECT comment_id, COUNT(*) AS like_count
        FROM commentlikes
        GROUP BY comment_id;
        `)
        const result = likes.rows;

        res.json(result)

    } catch (err) {
        console.error(err.message)
    }
})

app.get('/commentdislikes', async (req, res) => {
    try {
        const dislikes = await pool.query(
        `SELECT comment_id, COUNT(*) AS dislike_count
        FROM commentdislikes
        GROUP BY comment_id;
        `)
        const result = dislikes.rows;

        res.json(result)

    } catch (err) {
        console.error(err.message)
    }
})

app.get('/forumlikes', async (req, res) => {
    try {
        const likes = await pool.query(
        `SELECT comment_id, COUNT(*) AS like_count
        FROM commentlikes
        GROUP BY comment_id;
        `)
        const result = likes.rows;

        res.json(result)

    } catch (err) {
        console.error(err.message)
    }
})

app.get('/forumdislikes', async (req, res) => {
    try {
        const dislikes = await pool.query(
        `SELECT post_id, COUNT(*) AS dislike_count
        FROM dislikes
        GROUP BY post_id;
        `)
        const result = dislikes.rows;

        res.json(result)

    } catch (err) {
        console.error(err.message)
    }
})

app.get('/commentlikesdislikes', async (req, res) => {

    const userid = req.query.userid;
    try {
        const likes = await pool.query(`SELECT comment_id FROM commentlikes WHERE user_id = $1`, [userid])
        const dislikes = await pool.query(`SELECT comment_id FROM commentdislikes WHERE user_id = $1`, [userid])

        const result = [
            ...likes.rows.map(like => ({ comment_id: like.comment_id, type: 'like' })),
            ...dislikes.rows.map(dislike => ({ comment_id: dislike.comment_id, type: 'dislike' }))
        ];
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

//////////////////////////////// REPORT SYSTEM ///////////////////////////////////////

app.post('/threadreport', async (req, res) => {
    try {
        const { user_id, thread_id, reported_user, reason, report_desc } = req.body
        console.log(user_id, thread_id, reported_user, reason, report_desc)

        const result = await pool.query('INSERT INTO threadreports (reporting_uid, thread_id, reported_uid, reason, report_desc) VALUES ($1, $2, $3, $4, $5)', [user_id, thread_id, reported_user, reason, report_desc])
        res.json(result.rows[0])

    } catch (err){
        res.status(500).json({error: 'Internal server error'});
    }
})

app.get('/viewreports', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                report_id, reporting_uid, reported_uid, reason, report_desc, reported_at, is_reviewed, 'thread' AS report_type
            FROM threadreports
            WHERE is_reviewed = $1

            UNION ALL

            SELECT 
                report_id, reporting_uid, reported_uid, reason, report_desc, reported_at, is_reviewed, 'comment' AS report_type
            FROM commentreports
            WHERE is_reviewed = $1
        `, [false]);
        console.log("RESULT: ", result)
        res.json(result.rows)

    } catch (err){
        res.status(500).json({error: 'Internal server error'});
    }
})

//////////////////////////////// RESET PASSWORD //////////////////////////////////////

app.post('/passwordreset', async (req, res) => {
    const { email } = req.body;
    const result = await pool.query('SELECT * FROM forumusers WHERE email = $1', [email]);
    const user = result.rows[0];

    const generateRandomCode = () => {
      const buffer = crypto.randomBytes(3);
      const code = buffer.readUIntBE(0, 3);
      return code % 1000000;
    }
    const randomcode = generateRandomCode()

    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await pool.query('INSERT INTO passwordreset (email, reset_code, expires_at, used) VALUES ($1, $2, $3, $4)',[user.email, randomcode, expires_at, false])

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        secure: false,
        auth: {
            user: "smashpointssb@gmail.com",
            pass: process.env.EMAIL_APP_PASS
        },
    })
    
    const mailOptions = {
        from: 'smashpointssb@gmail.com',
        to: email,
        subject: 'Reset your password',
        text: `Your password reset code is: ${randomcode}. This code is valid for 24 hours.`,
    }
    console.log(email)
    transporter.sendMail(mailOptions, function (err, info){
        if(err){
            console.log(err);
        } else{
            console.log('Sent: ' + info.response)
        }
    });
  })


app.post('/passwordverify', async (req, res) => {
    const verificationcode = req.body.code
    try {    
        const getcode = await pool.query(
          'SELECT reset_code, expires_at, used FROM passwordreset WHERE reset_code = $1',
          [verificationcode]
        )
        if (getcode.rows.length > 0) {
            const codeRow = getcode.rows[0]
            if (codeRow.used) {
                console.log('Code has already been used.')
            } else if (codeRow.expires_at < new Date()) {
                console.log('Code is expired.')
            } else {
                console.log('Code is valid.')
                
                await pool.query('UPDATE passwordreset SET used = true WHERE reset_code = $1',[verificationcode])

                console.log('Code usage status updated in the database.')
            }
        } else {
            console.log('Code is invalid.')
        }
    } catch (error) {
        console.log(verificationcode)
    }
    res.json(verificationcode)
})

//////////////////////////////// VERIFY EMAIL //////////////////////////////////////

app.post('/emailverify', async (req, res) => {
    try {
        const { emailCode, email } = req.body;
        console.log(emailCode, email)
        const query = `
            SELECT COUNT(*) AS count
            FROM emailverify e
            JOIN forumusers u ON e.user_id = u.users_id
            WHERE e.verification_code = $1 AND u.email = $2;
        `;
        const { rows } = await pool.query(query, [emailCode, email]);
        const count = parseInt(rows[0].count, 10);
        if (count > 0) {
            res.json(true);
        } else {
            res.json(false);
        }
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//////////////////////////////// FRIENDS LIST //////////////////////////////////////

//Add friend
app.post('/add-friend/:usersid/:friendsid', async (req, res) => {
    const users_id = parseInt(req.params.usersid, 10)
    const friends_id = parseInt(req.params.friendsid, 10)

    try {
        const { isRequest } = req.body;

        const currentStatusQuery = `
            SELECT status
            FROM friendships
            WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1);
        `

        const currentStatusResult = await pool.query(currentStatusQuery, [users_id, friends_id]);
        const currentStatus = currentStatusResult.rows.length > 0 ? currentStatusResult.rows[0].status : null;

        let newStatus;
        if (currentStatus) {
            newStatus = 'accepted';
            const updateStatusQuery = `
                UPDATE friendships
                SET status = 'accepted'
                WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)
            `;
            await pool.query(updateStatusQuery, [users_id, friends_id]);
        } else {
            newStatus = isRequest ? 'pending' : 'accepted';
            const addFriendQuery = `
                INSERT INTO friendships (user_id1, user_id2, status)
                VALUES ($1, $2, 'pending');
            `
            await pool.query(addFriendQuery, [users_id, friends_id])
        }
        
        res.json({ success: true, newStatus });
    } catch (error) {
        console.error('Error updating friend status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


//Remove friend
app.post('/remove-friend/:usersid/:friendsid', async (req, res) => {
  const users_id = parseInt(req.params.usersid, 10);
  const friends_id = parseInt(req.params.friendsid, 10);

  try {
    const removeFriendQuery = `
      DELETE FROM friendships
      WHERE (
        (user_id1 = $1 AND user_id2 = $2) OR
        (user_id1 = $2 AND user_id2 = $1)
      )
      AND status = 'accepted';
    `;

    await pool.query(removeFriendQuery, [users_id, friends_id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Get all friends
app.get('/all-friends/:userid', async (req, res) => {
    const users_id = parseInt(req.params.userid, 10)
    
    try {
        const allFriendsQuery = `
        SELECT
            CASE
                WHEN user_id1 = $1 THEN user_id2
                ELSE user_id1
            END AS friend_id,
            forumusers.username
        FROM friendships
        JOIN forumusers ON friendships.user_id1 = forumusers.users_id OR friendships.user_id2 = forumusers.users_id
        WHERE (($1 IN (user_id1, user_id2)) AND status = 'accepted') AND forumusers.users_id != $1;
        `

       const friends = await pool.query(allFriendsQuery, [users_id])

        if(friends.rows.length === 0) {
            res.json({ friends: 'no_friends', users_id })
        } else {
            res.json(friends.rows)
        }
    } catch (error) {
        console.error('Error retrieving friends:', error)
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
     }
})

//Get friendship status
app.get('/get-friendship-status/:userid/:friendid', async (req, res) => {
    
    const {userid, friendid} = req.params;
    try {
        const query = `
            SELECT user_id1, user_id2, status
            FROM friendships
            WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1);
        `;

        const result = await pool.query(query, [userid, friendid]);
        if (result.rows.length === 0) {
            res.json({
                status: 'not_friends',
                user_id1: parseInt(userid, 10),
                user_id2: parseInt(friendid, 10),
            });
        } else {
            const row = result.rows[0];
            res.json({
                status: row.status,
                user_id1: parseInt(row.user_id1, 10),
                user_id2: parseInt(row.user_id2, 10),
            });
        }
    } catch (error) {
        console.error('Error fetching friendship status:', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

//Get user profile picture
app.get('/get-pfp/:userid', async (req, res) => {
    try {
        const { userid } = req.params;
        
        const response = await pool.query(
            `SELECT character_name, selected_skin 
            FROM forumusers 
            WHERE users_id = $1`,
            [userid]
        );

        if (response.rows.length !== 0) {
            res.json(response.rows[0]);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error finding user profile picture.', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//Update user profile picture
app.post('/change-pfp/:userid', async (req, res) => {
    const {userid} = req.params;
    const {clickedImage, newCharacter} = req.body;

    const match = clickedImage.match(/_([0-9]+)\.png$/);
    const numberStr = match[1];

    const character_name = newCharacter;
    const selected_skin = parseInt(numberStr, 10);
    
    console.log("Selected Image: ", clickedImage)
    try {
        const updatepfpimage = `
        UPDATE forumusers SET character_name = $1, selected_skin = $2 WHERE users_id = $3
        `;

        await pool.query(updatepfpimage, [character_name, selected_skin, userid]);
        console.log(character_name, selected_skin)
        res.json({ success: true });
    } catch (error) {
        console.error('Error changing profile picture:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

//Update user profile info
app.post('/update-profile/:userid', async (req, res) => {
    const {userid} = req.params
    const {username, location, description} = req.body

    try {
        const result = await pool.query(
            `UPDATE forumusers 
             SET username = COALESCE($1, username),
                 location = COALESCE($2, location), 
                 description = COALESCE($3, description) 
             WHERE users_id = $4`,
            [username, location, description, userid]
        );

         if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({ message: "Profile updated successfully!" });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ error: "Internal server error." });
    }
})

//Get user profile 
app.get('/retrieve-image/:userid', async (req, res) => {
    const {userid} = req.params;

    try {
        const getpfpimage = `
        SELECT character_name, selected_skin FROM forumusers WHERE users_id = $1
        `;

        const result = await pool.query(getpfpimage, [userid]);
        console.log(result)
        res.json( result.rows );
    } catch (error) {
        console.error('Error changing profile picture:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})


const algorithm = process.env.ALGORITHM;
const secretKey = process.env.SECRET_KEY;

app.get('/config', authenticateToken, (req, res) => {
    res.json({
        algorithm: process.env.ALGORITHM,
        secretKey: process.env.SECRET_KEY
    });
});

//Saves encrypted messages to database
const saveMessageToDB = async ({ sender_id, receiver_id, message_text, username }) => {
    try {
        console.log("📩 Storing message:", message_text);

        const [iv, content] = message_text.split(":");
        if (!iv || !content) {
            console.error("❌ Invalid encrypted message format:", message_text);
            return null;
        }

        const newMessage = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, message_text, iv) 
             VALUES($1, $2, $3, $4) RETURNING *`,
            [sender_id, receiver_id, content, iv]
        );

        const existingNotification = await pool.query(
            `SELECT * FROM notifications WHERE users_id = $1 AND type = $2 AND entity_id = $3`,
            [receiver_id, "directmessage", sender_id]
        );

        let notificationMessage;
        if (existingNotification.rows.length > 0) {
            const notification = existingNotification.rows[0];
            const newMessageCount = (notification.message_count || 1) + 1;
            notificationMessage = `${username} sent you ${newMessageCount} direct messages.`;

            await pool.query(
                `UPDATE notifications SET message = $1, message_count = $2, created_at = NOW() 
                 WHERE notification_id = $3`,
                [notificationMessage, newMessageCount, notification.notification_id]
            );
        } else {
            notificationMessage = `${username} sent you a message.`;
            await pool.query(
                `INSERT INTO notifications (users_id, type, entity_id, message, message_count) 
                 VALUES($1, $2, $3, $4, $5)`,
                [receiver_id, "directmessage", sender_id, notificationMessage, 1]
            );
        }

        return newMessage.rows[0];
    } catch (err) {
        console.error("Error saving message to DB:", err);
        return null;
    }
};

//Retrieves encrypted messages from database
const getMessagesFromDB = async (userId, friendId) => {
    try {
        console.log("Hello World!")
        const result = await pool.query(
            `SELECT message_id, sender_id, receiver_id, message_text, iv, timestamp, is_deleted 
             FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) 
                OR (sender_id = $2 AND receiver_id = $1) 
             ORDER BY timestamp ASC`,
            [userId, friendId]
        );

        return result.rows;
    } catch (error) {
        console.error("Error retrieving messages from database:", error);
        return [];
    }
};

//Websocket connection started
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", ({ userId, friendId }) => {
        const room = getDMRoomName(userId, friendId);
        socket.join(room);
        console.log(`User ${userId} joined room ${room}`);
    });

    socket.on("sendMessage", async (data) => {
        const { sender_id, receiver_id, message_text, username} = data;
        try {
            const savedMessage = await saveMessageToDB({
                sender_id,
                receiver_id,
                message_text,
                username,
            });

            if (!savedMessage) {
                console.error("Failed to save message to DB");
                return;
            }

            savedMessage.message_text = `${savedMessage.iv}:${savedMessage.message_text}`;

            const roomName = `dm-${sender_id}-${receiver_id}`;
            io.to(roomName).emit("receiveMessage", savedMessage);
            socket.emit("messageSent", savedMessage);
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });

    socket.on("getMessageHistory", async ({ userId, friendId }) => {
        try {
        const messages = await getMessagesFromDB(userId, friendId);
        socket.emit('messageHistory', { friendId, messages });
        } catch (error) {
        console.error('Error retrieving message history:', error);
        }
    });

    socket.on("deleteMessage", async ({ messageId }) => {
        try {
            await pool.query(
                `UPDATE messages SET is_deleted = true WHERE message_id = $1`,
                [messageId]
            );

            const messageResult = await pool.query(
                `SELECT sender_id, receiver_id FROM messages WHERE message_id = $1`,
                [messageId]
            );

            if (messageResult.rows.length === 0) {
                console.error("Message not found after delete.");
                return;
            }

            const { sender_id, receiver_id } = messageResult.rows[0];
            const room = getDMRoomName(sender_id, receiver_id);

            io.to(room).emit("deleteMessage", {
                message_id: messageId,
                sender_id,
                receiver_id,
            });

            console.log(`Message ${messageId} marked as deleted and broadcast to room ${room}`);
        } catch (err) {
            console.error("Error deleting message:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // Helper
    function getDMRoomName(userId1, userId2) {
        const sorted = [userId1, userId2].sort((a, b) => a - b);
        return `dm-${sorted[0]}-${sorted[1]}`;
    }
});

//Get notifications for user
app.get('/notifications/:userid', async (req, res) => {
    try {
        const { userid } = req.params;
        const notifications = await pool.query(
            'SELECT * FROM notifications WHERE users_id = $1 ORDER BY created_at DESC', [userid]);
        res.json(notifications.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

//Post feedback info to database
app.post('/feedback', async (req, res) => {
    try {
        const {issue, message} = req.body;
        await pool.query(
            'INSERT INTO user_feedback (issue, problem) VALUES ($1, $2)', [issue, message]
        );

        res.json({ success: true })
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
})

//Set unread notification to read
app.post('/notifications/mark-read', authenticateToken, async (req, res) => {
    try {
        const { userid } = req.body;
        console.log(userid)
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE users_id = $1',
            [userid]
        );
        res.send('Notification marked as read');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

