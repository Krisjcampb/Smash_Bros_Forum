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
    pool.query('SELECT username, users_id, role FROM forumusers WHERE users_id = $1', [req.user.users_id], (err, result) =>{
        if (err) {
            console.error(err)
            res.sendStatus(500);
        } else if (result.rows.length === 0) {
            console.log(req.user.users_id)
            res.sendStatus(404);
        } else {
            res.json({name: result.rows[0].username, id: result.rows[0].users_id, role: result.rows[0].role});
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

//get a forum user
app.get("/forumusers/:id", async(req, res) => {
    try {
        const { id } = req.params;
        const forumusers = await pool.query("SELECT * FROM forumusers WHERE users_id = $1", [id])

        res.json(forumusers.rows[0])
    } catch (err) {
        console.error(err.message)
    }
})

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
                user: "pnwsmashhub@gmail.com",
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
app.get('/forumcontent', async (req, res) => {
  try {
    const allForumcontent = await pool.query(`
      SELECT fc.*
      FROM forumcontent fc
      JOIN forumusers fu ON fc.users_id = fu.users_id
      WHERE fu.is_banned = FALSE
    `);
    res.json(allForumcontent.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.get('/forumcontent', async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;

    const offset = (page - 1) * limit;

    const paginatedQuery = `
      SELECT fc.*
      FROM forumcontent fc
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
app.get('/forumcontent/:threadID', async (req, res) => {
  try {
    const { threadID } = req.params
    console.log(threadID)
    const forumcontent = await pool.query(
      'SELECT * FROM forumcontent WHERE thread_id = $1',
      [threadID]
    )
    res.json(forumcontent.rows[0])
  } catch (err) {
    console.error(err.message)
  }
})

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
        console.log(thread.postdate, timeDiffInHours)
        if (!content || !title || timeDiffInHours >= 1) {
            return res.status(400).json({ error: 'Invalid thread to edit.' });
        }

        
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
        const { userid } = req.params
        const getThreadcontent = await pool.query(`
            SELECT fc.*
            FROM forumcontent fc
            INNER JOIN forumcomments fcm ON fc.thread_id = fcm.thread_id
            WHERE fcm.users_id = $1;`, [userid]
        )
        res.json(getThreadcontent.rows)
    } catch {
        console.error('Error getting thread content:', error);
        res.status(500).json({ error: 'An error occurred while getting the thread content.' });
    }
})
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
    try {
        const { thread_id, comment, user, timeposted, userid } = req.body;
        const newForumcomment = await pool.query(
        'INSERT INTO forumcomments (thread_id, comment, username, timeposted, users_id) VALUES($1, $2, $3, $4, $5) RETURNING *',
        [thread_id, comment, user, timeposted, userid]
        );

        const threadCreator = await pool.query('SELECT users_id FROM forumcontent WHERE thread_id = $1', [thread_id]);
        const threadCreatorId = threadCreator.rows[0].users_id;
        console.log(threadCreatorId, userid);


        if (threadCreatorId !== userid) {
            const threadUrl = `/threads/${thread_id}`;
            const existingNotification = await pool.query(
            'SELECT * FROM notifications WHERE users_id = $1 AND type = $2 AND entity_id = $3',
            [threadCreatorId, 'comment', thread_id]
        );

        let notificationMessage;
        let uniqueCommenters = [];

        if (existingNotification.rows.length > 0) {
            const notification = existingNotification.rows[0];
            uniqueCommenters = JSON.parse(notification.unique_commenters || '[]');

            if (!uniqueCommenters.includes(userid)) {
                uniqueCommenters.push(userid);
            }

            const uniqueCommentersCount = uniqueCommenters.length - 1;

            notificationMessage = uniqueCommentersCount > 0 
            ? `${user} + ${uniqueCommentersCount} others have commented on your thread.` 
            : `${user} commented on your thread.`;

            await pool.query(
            'UPDATE notifications SET is_read = FALSE, latest_commenter = $1, unique_commenters = $2, message = $3 WHERE notification_id = $4',
            [user, JSON.stringify(uniqueCommenters), notificationMessage, notification.notification_id]
            );
        } else {
            uniqueCommenters.push(userid);
            notificationMessage = `${user} commented on your thread.`;
            await pool.query(
            'INSERT INTO notifications (users_id, type, entity_id, message, latest_commenter, unique_commenters) VALUES($1, $2, $3, $4, $5, $6)',
            [threadCreatorId, 'comment', thread_id, notificationMessage, user, JSON.stringify(uniqueCommenters)]
            );
        }
    }

    res.json(newForumcomment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

//get forumcomments
app.get('/forumcomments/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params
    const forumcomments = await pool.query(
      `SELECT fc.*, fu.character_name, fu.selected_skin
       FROM forumcomments fc
       JOIN forumusers fu ON fc.users_id = fu.users_id
       WHERE fc.thread_id = $1
         AND fc.is_deleted = FALSE
         AND (fu.is_banned IS NULL OR fu.is_banned = FALSE)`,
      [thread_id]
    );
    console.log(forumcomments.rows)
    res.json(forumcomments.rows)
  } catch (err) {
    console.error(err.message)
  }
})

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
app.listen(5000, () => {
    console.log("server has started on port 5000");

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

    await pool.query('INSERT INTO passwordreset (email, reset_code, expires_at, used) VALUES ($1, $2, $3, $4)',[user.email, randomcode, expires_at, false])

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        secure: false,
        auth: {
            user: "pnwsmashhub@gmail.com",
            pass: process.env.EMAIL_APP_PASS
        },
    })
    
    const mailOptions = {
        from: 'pnwsmashhub@gmail.com',
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

app.get('/get-friendship-status/:userid/:friendid', async (req, res) => {
    
    const {userid, friendid} = req.params;
    try {
        const query = `
            SELECT user_id1, user_id2, status
            FROM friendships
            WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1);
        `;

        const result = await pool.query(query, [userid, friendid]);

        if(result.rows.length === 0) {
            res.json({status: 'not_friends', userid});
        } else {
            res.json({status: result.rows[0]});
        }
    } catch (error) {
        console.error('Error fetching friendship status:', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.get('/get-pfp/:userid', async (req, res) => {
    try {
        const { userid } = req.params;
        console.log(userid);
        
        const response = await pool.query(
            `SELECT character_name, selected_skin 
            FROM forumusers 
            WHERE users_id = $1`,
            [userid]
        );
        
        console.log(response);

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

app.post('/change-pfp/:userid', async (req, res) => {
    const {userid} = req.params;
    const {clickedImage, character} = req.body;

    const match = clickedImage.match(/_([0-9]+)\.png$/);
    const numberStr = match[1];

    const character_name = character;
    const selected_skin = parseInt(numberStr, 10);
    
    console.log("Selected Image: ", clickedImage)
    try {
        const updatepfpimage = `
        UPDATE forumusers SET character_name = $1, selected_skin = $2 WHERE users_id = $3
        `;

        await pool.query(updatepfpimage, [character_name, selected_skin, userid]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error changing profile picture:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

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

app.post('/send-message', async (req, res) => {
  try {
    const { sender_id, receiver_id, message_text, username } = req.body;
    console.log("message: ", message_text)

    const [iv, content] = message_text.split(':');
    console.log("iv: ", iv, "content: ", content)
    const newMessage = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message_text, iv) VALUES($1, $2, $3, $4) RETURNING *',
      [sender_id, receiver_id, content, iv]
    );

    const existingNotification = await pool.query(
      'SELECT * FROM notifications WHERE users_id = $1 AND type = $2 AND entity_id = $3',
      [receiver_id, 'directmessage', sender_id]
    );

    let notificationMessage;

    if (existingNotification.rows.length > 0) {
      // Update existing notification
      const notification = existingNotification.rows[0];
      const newMessageCount = (notification.message_count || 1) + 1;
      notificationMessage = `${username} sent you ${newMessageCount} direct messages.`;

      await pool.query(
        'UPDATE notifications SET message = $1, message_count = $2, created_at = NOW() WHERE notification_id = $3',
        [notificationMessage, newMessageCount, notification.notification_id]
      );
    } else {
      notificationMessage = `${username} sent you a message.`;
      await pool.query(
        'INSERT INTO notifications (users_id, type, entity_id, message, message_count) VALUES($1, $2, $3, $4, $5)',
        [receiver_id, 'directmessage', sender_id, notificationMessage, 1]
      );
    }

    res.json(newMessage.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

app.get('/retrieve-messages/:userid/:friendid', async (req, res) => {
    const userId = parseInt(req.params.userid, 10)
    const friendId = parseInt(req.params.friendid, 10)
    try {
        const result = await pool.query(`
      SELECT sender_id, receiver_id, message_text, iv
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY timestamp;
    `, [userId, friendId]);
    
        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error'});
    }
})

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

