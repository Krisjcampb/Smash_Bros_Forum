const express = require("express");
const app = express();
const dotenv = require("dotenv")
dotenv.config();
const cors = require("cors");
const pool = require("./db");
const path = require('path');
const multer = require('multer');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');
const crypto = require("crypto")
const bcrypt = require("bcrypt")
const http = require('http');
const { Server } = require('socket.io');
const { verifyToken, verifyRole } = require('./auth');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { Readable } = require('stream');

const server = http.createServer(app);

const b2Client = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: 'us-west-004', // match your bucket region from the endpoint URL
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APP_KEY,
    },
});

// In production, FRONTEND_URL is set to frontend domain
// In development its localhost:3000
const allowedOrigins = [
  'http://localhost:3000',
  'https://smashbrosforum-production.up.railway.app',
  'https://smashbrosforum-production-a34a.up.railway.app',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  }
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

app.use(express.json());
app.use('/public/uploads', express.static('public/uploads'));

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error(err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}


//ROUTES//

//USERS ACCOUNT

//create a user
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/forumusers', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newForumusers = await pool.query(
            "INSERT INTO forumusers (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [username, email, hashedPassword]
        );

        const userId = newForumusers.rows[0].users_id || newForumusers.rows[0].id;
        const randomcode = crypto.randomInt(100000, 999999).toString();
        const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
            'INSERT INTO emailverify (user_id, verification_code, expires_at, verified) VALUES ($1, $2, $3, $4)',
            [userId, randomcode, expires_at, false]
        );

        res.status(201).json({ 
            user: { id: userId, username: username }, 
            message: 'User registered successfully. Please check your email.' 
        });

        // Send verification email via Resend
        resend.emails.send({
            from: 'SmashPoint <no-reply@smashpoint.gg>',
            to: email,
            subject: 'Verify your email address',
            text: `Your verification code is: ${randomcode}. This code is valid for 24 hours.`,
        }).catch(err => console.error('Email error:', err.message));

    } catch (err) {
        console.error('Error in /forumusers endpoint:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
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
                const token = jwt.sign({users_id: user.rows[0].users_id, username: user.rows[0].username, role: user.rows[0].role}, process.env.JWT_SECRET)
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

app.get('/get-public-key/:userid', authenticateToken, async (req, res) => {
    try {
        const { userid } = req.params;
        const result = await pool.query(
            'SELECT public_key FROM forumuser_public_keys WHERE users_id = $1',
            [userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Public key not found for this user' });
        }

        res.json({ publicKey: result.rows[0].public_key });
    } catch (err) {
        console.error('Error fetching public key:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

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

// Edit forum user
// Only accessible by admins and moderators
app.put('/forumusers/edit/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const { username, location, description } = req.body;

    // Check role directly from the JWT since authenticateToken already decoded it
    const requestingRole = req.user.role;
    if (requestingRole !== 'admin' && requestingRole !== 'moderator') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
        if (username) {
            const existing = await pool.query(
                'SELECT users_id FROM forumusers WHERE username = $1 AND users_id != $2',
                [username, userId]
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'Username is already taken' });
            }
        }

        const result = await pool.query(
            `UPDATE forumusers
             SET username = COALESCE($1, username),
                 location = COALESCE($2, location),
                 description = COALESCE($3, description)
             WHERE users_id = $4
             RETURNING users_id, username, location, description`,
            [username || null, location || null, description || null, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Error updating user:', err.message);
        res.status(500).send('Server error');
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

// Save encrypted private key blob
app.post('/save-encrypted-key', async (req, res) => {
    try {
        const { email, encryptedKey, salt, iv } = req.body;

        if (!email || !encryptedKey || !salt || !iv) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const userResult = await pool.query(
            'SELECT users_id FROM forumusers WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userResult.rows[0].users_id;

        // Upsert — handles re-registration edge cases
        await pool.query(
            `INSERT INTO forumuser_encrypted_keys (users_id, encrypted_key, salt, iv)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (users_id) DO UPDATE
             SET encrypted_key = $2, salt = $3, iv = $4, updated_at = NOW()`,
            [userId, encryptedKey, salt, iv]
        );

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Error saving encrypted key:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});


// Retrieve encrypted private key blob for the logged-in user (called at login)
app.get('/get-encrypted-key', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.users_id;

        const result = await pool.query(
            'SELECT encrypted_key, salt, iv FROM forumuser_encrypted_keys WHERE users_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No encrypted key found for this user' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching encrypted key:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});


// Update encrypted key blob (called when user changes their passphrase)
app.put('/update-encrypted-key', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.users_id;
        const { encryptedKey, salt, iv } = req.body;

        if (!encryptedKey || !salt || !iv) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await pool.query(
            `UPDATE forumuser_encrypted_keys
             SET encrypted_key = $1, salt = $2, iv = $3, updated_at = NOW()
             WHERE users_id = $4`,
            [encryptedKey, salt, iv, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No key found to update' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating encrypted key:', err.message);
        res.status(500).json({ error: 'Server error' });
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

        await pool.query(
            `UPDATE emailverify SET verification_code = $1, expires_at = $2 WHERE user_id = $3`,
            [randomcode, expires_at, userId]
        );

        resend.emails.send({
            from: 'SmashPoint <no-reply@smashpoint.gg>',
            to: email,
            subject: 'Verify your email address',
            text: `Your verification code is: ${randomcode}. This code is valid for 24 hours.`,
        }).catch(err => console.error('Email error:', err.message));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating verification code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//update a forum user
app.put("/forumusers", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email, password)
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                error: "Email, password, and verification code are required" 
            });
        }

        if (password.length < 8) {
            return res.status(400).json({ 
                error: "Password must be at least 8 characters" 
            });
        }

        const lowerEmail = email.toLowerCase();

        const hashedPassword = await bcrypt.hash(password, 12);

        const resetResult = await pool.query(
            `SELECT * FROM passwordreset 
             WHERE LOWER(email) = $1 
             AND used = false
             AND expires_at > NOW()`,
            [lowerEmail]
        );

        const resetRecord = resetResult.rows[0];
        console.log(resetRecord)

        // Update the user's password
        const updateResult = await pool.query(
            `UPDATE forumusers 
             SET password = $1 
             WHERE LOWER(email) = $2 
             RETURNING users_id, username, email`,
            [hashedPassword, lowerEmail]
        );

        if (updateResult.rows.length === 0) {
            // This shouldn't happen if reset code exists, but handle it
            return res.status(404).json({ 
                error: "User not found" 
            });
        }

        await pool.query(
            `DELETE FROM passwordreset 
             WHERE LOWER(email) = $1 
             AND id != $2`,
            [lowerEmail, resetRecord.id]
        );

        res.json({ 
            success: true, 
            message: "Password updated successfully",
            user: {
                id: updateResult.rows[0].users_id,
                username: updateResult.rows[0].username,
                email: updateResult.rows[0].email
            }
        });

    } catch (err) {
        console.error("Error updating password:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

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

app.post('/forumimages', (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Image must be under 10MB' });
        }
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

            const { thread_id } = req.body;
            if (!thread_id) return res.status(400).json({ error: 'thread_id is required' });

            const ext = req.file.originalname.split('.').pop();
            const filename = `threads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            const uploader = new Upload({
                client: b2Client,
                params: {
                    Bucket: process.env.B2_BUCKET_NAME,
                    Key: filename,
                    Body: Readable.from(req.file.buffer),
                    ContentType: req.file.mimetype,
                },
            });

            await uploader.done();

            const filepath = `${process.env.CDN_URL}/${filename}`;

            await pool.query(
                'INSERT INTO forumimages (filepath, thread_id) VALUES ($1, $2)',
                [filepath, thread_id]
            );

            res.status(200).json({ success: true, filepath });

        } catch (unexpectedErr) {
            console.error('Error uploading to B2:', unexpectedErr);
            res.status(500).json({ error: 'Failed to upload image' });
        }
    });
});

//get all forum images

app.get('/forumimages', async (req, res) => {
  try {
    const allForumimages = await pool.query('SELECT * FROM forumimages')
    res.json(allForumimages.rows)
  } catch (err) {
    console.error(err.message)
  }
})

app.get('/getProfilePictures', async (req, res) => {
  try {
    await b2.authorize();

    const response = await b2.listFileNames({
      bucketId: process.env.B2_BUCKET_ID,
      prefix: 'profile-presets/'
    });

    const files = response.data.files.map(file => ({
      fileName: file.fileName,
      url: `https://f000.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${file.fileName}`
    }));

    res.json(files);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile pictures' });
  }
});

app.post('/saveProfilePicture', async (req, res) => {
    const { userId, selectedImage } = req.body;

    try {
        await pool.query(
            'UPDATE forumusers SET profile_picture = $1 WHERE users_id = $2',
            [selectedImage, userId]
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile picture' });
    }
});


/////////////////////////////////// FORUM CONTENT //////////////////////////////////////

app.post('/forumcontent', async (req, res) => {
  try {
    const {title, content, likes, comments, username, postdate, usersId} = req.body
    const newForumcontent = await pool.query(
      "INSERT INTO forumcontent (title, content, username, postdate, users_id) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [title, content, username, postdate, usersId]
    );
    console.log(newForumcontent.rows[0])
    res.json(newForumcontent.rows[0])
    
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error');
  }
})

app.get('/forumcontent', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const offset = (page - 1) * limit;

    const paginatedQuery = `
      SELECT
        fc.*,
        fi.filepath,
        fu.character_name,
        fu.selected_skin,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM forumcontent fc
      LEFT JOIN forumimages fi ON fc.thread_id = fi.thread_id
      JOIN forumusers fu ON fc.users_id = fu.users_id
      LEFT JOIN (
        SELECT thread_id, COUNT(*) AS comment_count
        FROM forumcomments
        WHERE is_deleted = FALSE
        GROUP BY thread_id
      ) cc ON fc.thread_id = cc.thread_id
      WHERE fu.is_banned = FALSE
      AND fc.is_deleted = FALSE
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
    res.json(deleteForumcontent.rows)
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

    const { thread_id, comment, user, userid } = req.body;

    const validThreadId = validateId(thread_id, 'thread_id');
    const validUserId = validateId(userid, 'userid');

    /* -------------------- Extract Mentions From Comment -------------------- */
    const extractMentions = (text) => {
    const regex = /@([a-zA-Z0-9_]+)/g;
    const matches = [...text.matchAll(regex)];

    return matches.map(match => ({
        username: match[1],
        position: match.index,
        length: match[0].length
    }));
    };

    const mentionMatches = extractMentions(comment);
    const mentionObjects = [];
    const mentionedUsers = new Set();

    /* -------------------- Insert Comment (temporarily empty mentions) -------------------- */
    const newComment = await client.query(
    `
    INSERT INTO forumcomments 
        (thread_id, comment, username, timeposted, users_id, mentions)
    VALUES ($1, $2, $3, NOW(), $4, $5)
    RETURNING comment_id
    `,
    [validThreadId, comment, user, validUserId, JSON.stringify([])]
    );

    /* -------------------- Thread Info -------------------- */
    const threadResult = await client.query(
      `SELECT title, users_id FROM forumcontent WHERE thread_id = $1`,
      [validThreadId]
    );

    const threadTitle = threadResult.rows[0]?.title ?? 'a thread';
    const threadCreatorId = threadResult.rows[0]?.users_id;

    /* -------------------- Mention Notifications -------------------- */
    for (const mention of mentionMatches) {
      const { username, position, length } = mention;
      const userResult = await client.query(
        `SELECT users_id FROM forumusers WHERE username = $1`,
        [username]
      );

      const mentionedUserId = userResult.rows[0]?.users_id;
      if (!mentionedUserId) continue;

      if (mentionedUserId === validUserId) continue;
      if (mentionedUsers.has(mentionedUserId)) continue;

      mentionObjects.push({ username, position, length });

      const existingMention = await client.query(
        `
        SELECT notification_id, unique_commenters
        FROM notifications
        WHERE users_id = $1
          AND type = 'mention'
          AND entity_id = $2
        `,
        [mentionedUserId, validThreadId]
      );

      if (existingMention.rows.length > 0) {
        const existing = existingMention.rows[0];
        const commenters = existing.unique_commenters
          ? JSON.parse(existing.unique_commenters)
          : [];

        if (!commenters.includes(validUserId)) {
          commenters.push(validUserId);
        }

        await client.query(
          `
          UPDATE notifications SET
            message = $1,
            unique_commenters = $2,
            message_count = $3,
            latest_commenter = $4,
            is_read = FALSE,
            created_at = NOW()
          WHERE notification_id = $5
          `,
          [
            commenters.length > 1
              ? `${user} and ${commenters.length - 1} others mentioned you in "${threadTitle}"`
              : `${user} mentioned you in "${threadTitle}"`,
            JSON.stringify(commenters),
            commenters.length,
            user,
            existing.notification_id
          ]
        );
      } else {
        await client.query(
          `
          INSERT INTO notifications
            (users_id, type, entity_id, message, unique_commenters, message_count, latest_commenter)
          VALUES ($1, 'mention', $2, $3, $4, 1, $5)
          `,
          [
            mentionedUserId,
            validThreadId,
            `${user} mentioned you in "${threadTitle}"`,
            JSON.stringify([validUserId]),
            user
          ]
        );
      }
    }

    /* -------------------- Thread Owner Comment Notification -------------------- */
    if (
      threadCreatorId &&
      threadCreatorId !== validUserId &&
      !mentionedUsers.has(threadCreatorId)
    ) {
      const existingNotification = await client.query(
        `
        SELECT notification_id, unique_commenters
        FROM notifications
        WHERE users_id = $1
          AND type = 'comment'
          AND entity_id = $2
        `,
        [threadCreatorId, validThreadId]
      );

      if (existingNotification.rows.length > 0) {
        const existing = existingNotification.rows[0];
        const commenters = existing.unique_commenters
          ? JSON.parse(existing.unique_commenters)
          : [];

        if (!commenters.includes(validUserId)) {
          commenters.push(validUserId);
        }

        await client.query(
          `
          UPDATE notifications SET
            message = $1,
            latest_commenter = $2,
            unique_commenters = $3,
            message_count = $4,
            is_read = FALSE,
            created_at = NOW()
          WHERE notification_id = $5
          `,
          [
            commenters.length > 1
              ? `${user} and ${commenters.length - 1} others commented on your thread`
              : `${user} commented on your thread`,
            user,
            JSON.stringify(commenters),
            commenters.length,
            existing.notification_id
          ]
        );
      } else {
        await client.query(
          `
          INSERT INTO notifications
            (users_id, type, entity_id, message, latest_commenter, unique_commenters, message_count)
          VALUES ($1, 'comment', $2, $3, $4, $5, 1)
          `,
          [
            threadCreatorId,
            validThreadId,
            `${user} commented on your thread`,
            user,
            JSON.stringify([validUserId])
          ]
        );
      }
    }
    await client.query(
    `
    UPDATE forumcomments
    SET mentions = $1
    WHERE comment_id = $2
    `,
    [JSON.stringify(mentionObjects), newComment.rows[0].comment_id]
    );
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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { commentId } = req.params;
    const { content, userId } = req.body;

    /* -------------------- Get Old Comment -------------------- */
    const oldResult = await client.query(
      `SELECT comment, mentions, thread_id 
       FROM forumcomments 
       WHERE comment_id = $1`,
      [commentId]
    );

    if (oldResult.rows.length === 0) {
      throw new Error('Comment not found');
    }

    const oldContent = oldResult.rows[0].comment;
    const oldMentions = oldResult.rows[0].mentions || [];
    const threadId = oldResult.rows[0].thread_id;

    /* -------------------- Extract Mentions From New Content -------------------- */
    const extractMentions = (text) => {
        const regex = /@([a-zA-Z0-9_]+)/g;
        const matches = [...text.matchAll(regex)];

        return matches.map(match => ({
            username: match[1],
            position: match.index,
            length: match[0].length // includes @
        }));
    };

    const mentionMatches = extractMentions(content);

    /* -------------------- Resolve Mentioned Users -------------------- */
    const mentionedUsers = new Set();
    const mentionObjects = [];

    for (const mention of mentionMatches) {
      const { username, position, length } = mention;
      console.log(`Processing mention: ${username} at position ${position} with length ${length}`);
      const userResult = await client.query(
        `SELECT users_id FROM forumusers WHERE username = $1`,
        [username]
      );

      const mentionedUserId = userResult.rows[0]?.users_id;
      if (!mentionedUserId) continue;
      if (mentionedUserId === userId) continue;
      if (mentionedUsers.has(mentionedUserId)) continue;

      mentionedUsers.add(mentionedUserId);
      mentionObjects.push({ username, position, length });

      /* ---- Only Notify If Newly Added ---- */
      const wasMentionedBefore = oldMentions.some(
        m => m.username === username
      );

      if (!wasMentionedBefore) {
        const threadResult = await client.query(
          `SELECT title FROM forumcontent WHERE thread_id = $1`,
          [threadId]
        );

        const threadTitle = threadResult.rows[0]?.title ?? 'a thread';

        await client.query(
          `
          INSERT INTO notifications
            (users_id, type, entity_id, message, unique_commenters, message_count, latest_commenter)
          VALUES ($1, 'mention', $2, $3, $4, 1, $5)
          `,
          [
            mentionedUserId,
            threadId,
            `You were mentioned in "${threadTitle}" (edited comment)`,
            JSON.stringify([userId]),
            userId
          ]
        );
      }
    }

    /* -------------------- Save Edit History -------------------- */
    await client.query(
      `
      INSERT INTO comment_edits (comment_id, old_content, new_content, edited_by)
      VALUES ($1, $2, $3, $4)
      `,
      [commentId, oldContent, content, userId]
    );

    /* -------------------- Update Comment + Mentions -------------------- */
    await client.query(
        `
        UPDATE forumcomments
        SET comment = $1,
            mentions = $2
        WHERE comment_id = $3
        `,
        [content, JSON.stringify(mentionObjects), commentId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      new_mentions_added: mentionedUsers.size
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Edit Comment Error]', err.message);
    res.status(500).json({ error: 'Failed to edit comment' });
  } finally {
    client.release();
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

app.post('/commentreport', async (req, res) => {
    try {
        const { user_id, comment_id, reported_user, reason, report_desc } = req.body
        console.log(user_id, comment_id, reported_user, reason, report_desc)

        const result = await pool.query('INSERT INTO commentreports (reporting_uid, comment_id, reported_uid, reason, report_desc) VALUES ($1, $2, $3, $4, $5)', [user_id, comment_id, reported_user, reason, report_desc])
        res.json(result.rows[0])

    } catch (err){
        res.status(500).json({error: 'Internal server error'});
    }
})

app.get('/viewreports', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                tr.report_id, 
                tr.reporting_uid, 
                tr.reported_uid, 
                tr.reason, 
                tr.report_desc, 
                tr.reported_at, 
                tr.is_reviewed, 
                tr.thread_id,
                tr.resolution_status, 
                COALESCE(tr.mod_notes, '') AS mod_notes, 
                'thread' AS report_type, 
                reporter.username AS reporter_username,
                reported.username AS reported_username
            FROM threadreports tr
            JOIN forumusers reporter ON tr.reporting_uid = reporter.users_id
            JOIN forumusers reported ON tr.reported_uid = reported.users_id

            UNION ALL

            SELECT 
                cr.report_id, 
                cr.reporting_uid, 
                cr.reported_uid, 
                cr.reason, 
                cr.report_desc, 
                cr.reported_at, 
                cr.is_reviewed, 
                cr.comment_id,
                cr.resolution_status, 
                COALESCE(cr.mod_notes, '') AS mod_notes, 
                'comment' AS report_type, 
                reporter.username AS reporter_username,
                reported.username AS reported_username
            FROM commentreports cr
            JOIN forumusers reporter ON cr.reporting_uid = reporter.users_id
            JOIN forumusers reported ON cr.reported_uid = reported.users_id
        `);
        console.log("Reports: ", result)
        res.json(result.rows)

    } catch (err){
        res.status(500).json({error: 'Internal server error'});
    }
})

app.put('/resolvereport', verifyToken, verifyRole(['admin', 'moderator']), async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            report_id,
            resolution_status,
            mod_notes,
            report_type,
            content_id,
        } = req.body;

        const moderator_id = req.userId

        if (!report_id || !resolution_status || !report_type) {
            return res.status(400).json({
                error: "report_id, resolution_status, and report_type are required"
            });
        }

        await client.query('BEGIN');

        if (resolution_status === "content_removed") {
            if (!content_id) {
                throw new Error("content_id is required when removing content");
            }

            if (report_type === "thread") {
                await client.query(`
                    UPDATE forumcontent
                    SET is_deleted = TRUE
                    WHERE thread_id = $1
                `, [content_id]);
            }

            if (report_type === "comment") {
                await client.query(`
                    UPDATE forumcomments
                    SET is_deleted = TRUE
                    WHERE comment_id = $1
                `, [content_id]);
            }
        }

        let reportResult;

        if (report_type === "comment") {
            reportResult = await client.query(`
                UPDATE commentreports
                SET
                    is_reviewed = TRUE,
                    resolution_status = $1,
                    mod_notes = $2,
                    reviewed_by = $3
                WHERE report_id = $4
                RETURNING *;
            `, [resolution_status, mod_notes, moderator_id, report_id]);
        } else {
            reportResult = await client.query(`
                UPDATE threadreports
                SET
                    is_reviewed = TRUE,
                    resolution_status = $1,
                    mod_notes = $2,
                    reviewed_by = $3
                WHERE report_id = $4
                RETURNING *;
            `, [resolution_status, mod_notes, moderator_id, report_id]);
        }

        if (reportResult.rowCount === 0) {
            throw new Error("Report not found");
        }

        await client.query('COMMIT');

        return res.json({
            success: true,
            report: reportResult.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Resolve report error:", err);

        return res.status(500).json({
            error: err.message
        });
    } finally {
        client.release();
    }
});

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

    await pool.query(
        'INSERT INTO passwordreset (email, reset_code, expires_at, used) VALUES ($1, $2, $3, $4)',
        [user.email, randomcode, expires_at, false]
    )

    resend.emails.send({
        from: 'SmashPoint <no-reply@smashpoint.gg>',
        to: email,
        subject: 'Reset your password',
        text: `Your password reset code is: ${randomcode}. This code is valid for 24 hours.`,
    }).catch(err => console.error('Email error:', err.message));

    res.json({ success: true });
})


app.post('/passwordverify', async (req, res) => {
    const verificationcode = req.body.code
    try {    
        const getcode = await pool.query(
            'SELECT reset_code, expires_at, used FROM passwordreset WHERE reset_code = $1',
            [verificationcode]
        )
        if (getcode.rows.length === 0) {
            return res.json({ success: false, error: 'Invalid code' })
        }

        const codeRow = getcode.rows[0]

        if (codeRow.used) {
            return res.json({ success: false, error: 'Code has already been used' })
        }
        if (codeRow.expires_at < new Date()) {
            return res.json({ success: false, error: 'Code has expired' })
        }

        await pool.query('UPDATE passwordreset SET used = true WHERE reset_code = $1', [verificationcode])
        return res.json({ success: true })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, error: 'Server error' })
    }
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
app.post('/add-friend/:friendsid', authenticateToken, async (req, res) => {
    const users_id = req.user.users_id;
    const friends_id = parseInt(req.params.friendsid, 10);

    if (users_id === friends_id) {
        return res.status(400).json({ error: "You cannot add yourself." });
    }

    // Reject the request if a block exists in either direction

    try {
        const blockCheck = await pool.query(
            `SELECT block_id FROM blocks 
            WHERE (blocker_id = $1 AND blocked_id = $2)
                OR (blocker_id = $2 AND blocked_id = $1)`,
            [users_id, friends_id]
        );

        if (blockCheck.rows.length > 0) {
            return res.status(403).json({ error: 'Cannot send friend request to this user' });
        }

        const existing = await pool.query(`
            SELECT * FROM friendships
            WHERE (user_id1 = $1 AND user_id2 = $2)
               OR (user_id1 = $2 AND user_id2 = $1)
        `, [users_id, friends_id]);

        if (existing.rows.length === 0) {
            await pool.query(`
                INSERT INTO friendships (user_id1, user_id2, status)
                VALUES ($1, $2, 'pending')
            `, [users_id, friends_id]);

            return res.json({ newStatus: 'pending' });
        }

        const currentStatus = existing.rows[0].status;

        if (currentStatus === 'pending') {
            await pool.query(`
                UPDATE friendships
                SET status = 'accepted'
                WHERE (user_id1 = $1 AND user_id2 = $2)
                   OR (user_id1 = $2 AND user_id2 = $1)
            `, [users_id, friends_id]);

            return res.json({ newStatus: 'accepted' });
        }

        return res.json({ newStatus: currentStatus });

    } catch (error) {
        console.error('Error updating friend status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//Remove friend
app.post('/remove-friend/:friendsid', authenticateToken, async (req, res) => {
    const users_id = req.user.users_id;
    const friends_id = parseInt(req.params.friendsid, 10);

    try {
        const result = await pool.query(`
            DELETE FROM friendships
            WHERE (
                (user_id1 = $1 AND user_id2 = $2) OR
                (user_id1 = $2 AND user_id2 = $1)
            )
        `, [users_id, friends_id]);

        console.log("Rows deleted:", result.rowCount);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Friendship not found." });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//Get all friends
app.get('/all-friends', authenticateToken, async (req, res) => {
    const users_id = req.user.users_id;

    try {
        const allFriendsQuery = `
        SELECT 
            f.friend_id,
            u.username
        FROM (
            SELECT 
                CASE 
                    WHEN user_id1 = $1 THEN user_id2
                    ELSE user_id1
                END AS friend_id
            FROM friendships
            WHERE $1 IN (user_id1, user_id2)
            AND status = 'accepted'
        ) f
        JOIN forumusers u ON u.users_id = f.friend_id;
        `;

        const friends = await pool.query(allFriendsQuery, [users_id]);
        console.log("Friends retrieved:", friends.rows);
        if (friends.rows.length === 0) {
            return res.json({ friends: "no_friends" });
        }

        res.json(friends.rows);

    } catch (error) {
        console.error("Error retrieving friends:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

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
                status: row ? row.status : 'not_friends',
                user_id1: row ? row.user_id1 : null
            });
        }
    } catch (error) {
        console.error('Error fetching friendship status:', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/block/:blockedId', authenticateToken, async (req, res) => {
    const blockerId = req.user.users_id;
    const { blockedId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO blocks (blocker_id, blocked_id) 
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [blockerId, blockedId]
        );

        // Remove friendship in both directions
        await client.query(
            `DELETE FROM friendships 
             WHERE (user_id1 = $1 AND user_id2 = $2) 
                OR (user_id1 = $2 AND user_id2 = $1)`,
            [blockerId, blockedId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error blocking user:', err);
        res.status(500).json({ error: 'Failed to block user' });
    } finally {
        client.release();
    }
});

// Unblock a user
app.post('/unblock/:blockedId', authenticateToken, async (req, res) => {
    const blockerId = req.user.id;
    const { blockedId } = req.params;
    try {
        await pool.query(
            `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
            [blockerId, blockedId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error unblocking user:', err);
        res.status(500).json({ error: 'Failed to unblock user' });
    }
});

// Check block status between two users
app.get('/block-status/:userId/:targetId', async (req, res) => {
    const { userId, targetId } = req.params;
    try {
        const result = await pool.query(
            `SELECT blocker_id FROM blocks 
             WHERE (blocker_id = $1 AND blocked_id = $2)
                OR (blocker_id = $2 AND blocked_id = $1)`,
            [userId, targetId]
        );

        if (result.rows.length === 0) {
            return res.json({ blocked: false, blockedByMe: false, blockedByThem: false });
        }

        const blockedByMe = result.rows.some(r => parseInt(r.blocker_id) === parseInt(userId));
        const blockedByThem = result.rows.some(r => parseInt(r.blocker_id) === parseInt(targetId));

        res.json({ blocked: true, blockedByMe, blockedByThem });
    } catch (err) {
        console.error('Error checking block status:', err);
        res.status(500).json({ error: 'Failed to check block status' });
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

app.get('/user-stats/:userid', async (req, res) => {
  const { userid } = req.params;

  try {
    const result = await pool.query(
        `
            SELECT
                u.users_id,
                u.created_at AS join_date,

                -- threads created
                (SELECT COUNT(*)
                FROM forumcontent fc
                WHERE fc.users_id = u.users_id) AS thread_count,

                -- comments posted
                (SELECT COUNT(*)
                FROM forumcomments c
                WHERE c.users_id = u.users_id) AS comment_count,

                -- thread likes received
                (SELECT COUNT(*)
                FROM likes l
                JOIN forumcontent fc ON fc.thread_id = l.post_id
                WHERE fc.users_id = u.users_id) AS thread_likes,

                -- comment likes received
                (SELECT COUNT(*)
                FROM commentlikes cl
                JOIN forumcomments c ON c.comment_id = cl.comment_id
                WHERE c.users_id = u.users_id) AS comment_likes

            FROM forumusers u
            WHERE u.users_id = $1;
        `,
        [userid]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

//Saves encrypted messages to database
const saveMessageToDB = async ({ sender_id, receiver_id, message_text, username }) => {
    try {
        console.log("📩 Storing message:", message_text);

        const parts = message_text.split("|");
        if (parts.length !== 4) {
            console.error("❌ Invalid encrypted message format:", message_text);
            return null;
        }

        const newMessage = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, message_text, iv) 
             VALUES($1, $2, $3, $4) RETURNING *`,
            [sender_id, receiver_id, message_text, 'v2']
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

const getMessagesFromDB = async (userId, friendId) => {
    try {
        const result = await pool.query(
            `SELECT 
                m.*, i.filepath, i.encrypted_key_sender, i.encrypted_key_recipient, i.iv as image_iv, i.mime_type
             FROM messages m
             LEFT JOIN encrypted_message_images i
                ON m.message_id = i.message_id
             WHERE (m.sender_id = $1 AND m.receiver_id = $2)
                OR (m.sender_id = $2 AND m.receiver_id = $1)
             ORDER BY m.timestamp ASC`,
            [userId, friendId]
        );

        return result.rows;
    } catch (err) {
        console.error(err);
        return [];
    }
};

app.post('/uploadEncryptedImage', (req, res) => {
    upload.single('image')(req, res, async (err) => {

        // ✅ Handle multer errors
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Image must be under 10MB' });
        }
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            const {
                message_id, // ✅ REQUIRED
                sender_id,
                receiver_id,
                encrypted_key_sender,
                encrypted_key_recipient,
                iv,
                mime_type,
                filename
            } = req.body;

            const file = req.file;

            // ✅ Validate required fields
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            if (!message_id) {
                return res.status(400).json({ error: 'message_id is required' });
            }

            if (!sender_id || !receiver_id) {
                return res.status(400).json({ error: 'Missing sender or receiver' });
            }

            if (!encrypted_key_sender || !encrypted_key_recipient || !iv) {
                return res.status(400).json({ error: 'Missing encryption data' });
            }

            // ✅ Generate safe extension
            const ext = file.mimetype.split('/')[1] || 'bin';

            // ✅ Unique filename (B2-safe)
            const uniqueName = `messages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            // ✅ Upload to Backblaze B2
            const uploader = new Upload({
                client: b2Client,
                params: {
                    Bucket: process.env.B2_BUCKET_NAME,
                    Key: uniqueName,
                    Body: Readable.from(file.buffer),
                    ContentType: file.mimetype,
                },
            });

            await uploader.done();

            const filepath = `${process.env.CDN_URL}/${uniqueName}`;

            // ✅ Insert into database (CORRECT STRUCTURE)
            const result = await pool.query(
                `INSERT INTO encrypted_message_images 
                (message_id, sender_id, receiver_id, filepath, encrypted_key_sender, encrypted_key_recipient, iv, mime_type, original_filename)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING *`,
                [
                    message_id,
                    sender_id,
                    receiver_id,
                    filepath,
                    encrypted_key_sender,
                    encrypted_key_recipient,
                    iv,
                    mime_type,
                    filename
                ]
            );

            const savedImage = result.rows[0];

            // ✅ Return clean response for frontend
            res.status(200).json({
                image_id: savedImage.id,
                message_id: savedImage.message_id,
                filepath: savedImage.filepath,
                encrypted_key_sender: savedImage.encrypted_key_sender,
                encrypted_key_recipient: savedImage.encrypted_key_recipient,
                iv: savedImage.iv,
                mime_type: savedImage.mime_type,
                original_filename: savedImage.original_filename
            });

        } catch (error) {
            console.error('Error uploading encrypted image:', error);
            res.status(500).json({ error: 'Failed to upload image' });
        }
    });
});

//Websocket connection started
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", ({ userId, friendId }) => {
        if (!userId || !friendId) {
            console.error("Invalid joinRoom payload:", { userId, friendId });
            return;
        }

        const room = getDMRoomName(userId, friendId);
        socket.join(room);
        console.log(`User ${userId} joined room ${room}`);
    });

    socket.on("sendMessage", async (data) => {
        try {
            const savedMessage = await saveMessageToDB({
                sender_id: data.sender_id,
                receiver_id: data.receiver_id,
                message_text: data.message_text,
                username: data.username
            });

            if (!savedMessage) return;

            const roomName = getDMRoomName(data.sender_id, data.receiver_id);

            const fullMessage = {
                ...savedMessage,
                filepath: data.filepath || null,
                encrypted_key_sender: data.encrypted_key_sender || null,
                encrypted_key_recipient: data.encrypted_key_recipient || null,
                image_iv: data.image_iv || null,
                mime_type: data.mime_type || null
            };

            io.to(roomName).emit("receiveMessage", fullMessage);

            socket.emit("messageSent", fullMessage);

        } catch (err) {
            console.error("sendMessage error:", err);
        }
    });

    socket.on("getMessageHistory", async ({ userId, friendId }) => {
        try {
        const messages = await getMessagesFromDB(userId, friendId);
        const formatted = messages.map(msg => ({
            ...msg,
            message_text: msg.iv === 'v2' 
                ? msg.message_text
                : `${msg.iv}:${msg.message_text}`
        }));
        socket.emit('messageHistory', { friendId, messages: formatted });
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

// Post feedback info to database
app.post('/feedback', async (req, res) => {
    try {
        const { issue, message, userId } = req.body;

        // Fixed: was passing 3 values into a query with only 2 placeholders
        await pool.query(
            'INSERT INTO forumfeedback (users_id, issue, problem) VALUES ($1, $2, $3)',
            [userId, issue, message]
        );

        res.json({ success: true })
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
})

app.post('/contact', async (req, res) => {
    try {
        const { email, name, message } = req.body;

        await pool.query(
            'INSERT INTO contact_messages (email, name, message) VALUES ($1, $2, $3)',
            [email, name, message]
        );

        res.json({ success: true })
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

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

// Get all calendar events
app.get('/calendar-events', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT event_id, title, start_date, end_date, location, url
             FROM calendar_events
             ORDER BY start_date ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching calendar events:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create a new event — admins and moderators only
app.post('/calendar-events', authenticateToken, async (req, res) => {
    const { role, users_id } = req.user;
    if (role !== 'admin' && role !== 'moderator') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { title, start_date, end_date, location, url } = req.body;

    if (!title || !start_date) {
        return res.status(400).json({ error: 'Title and start date are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO calendar_events (title, start_date, end_date, location, url, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title, start_date, end_date || null, location || null, url || null, users_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating calendar event:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete an event — admins and moderators only
app.delete('/calendar-events/:eventId', authenticateToken, async (req, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'moderator') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { eventId } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM calendar_events WHERE event_id = $1 RETURNING event_id',
            [eventId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting calendar event:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve the React build folder in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'build')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));