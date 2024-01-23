const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const multer = require('multer');
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv")
const crypto = require("crypto")
const bcrypt = require("bcrypt")
dotenv.config();

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
app.post("/forumusers", async(req, res) => {
    try{
        const {username, email, hashedpassword} = req.body;
        const newForumusers = await pool.query(
            "INSERT INTO forumusers (username, email, password) VALUES($1, $2, $3) RETURNING *", 
            [username, email, hashedpassword]
        );

        res.json(newForumusers.rows[0])
    }catch (err){
        console.error(err.message);
    }
})

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
    pool.query('SELECT username, users_id FROM forumusers WHERE users_id = $1', [req.user.users_id], (err, result) =>{
        if (err) {
            console.error(err)
            res.sendStatus(500);
        } else if (result.rows.length === 0) {
            console.log(req.user.users_id)
            res.sendStatus(404);
        } else {
            res.json({name: req.user.username, id: req.user.users_id});
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


//delete a forum thread
app.delete("/forumusers/:id", async (req, res) =>{
    try {
        const { id } = req.params;
        const deleteForumusers = await pool.query("DELETE FROM forumusers WHERE users_id = $1", [id]);
        res.json("Forumusers was deleted!")
    } catch (err) {
        console.log(err.message);
    }
});

/////////////////////////////////// FORUM IMAGES //////////////////////////////////////

app.post('/forumimages', upload.single('image'), (req, res) => {
    const {path} = req.file;
    console.log(req.file)
    pool.query(
      'INSERT INTO forumimages (filepath) VALUES ($1)',
      [path.replaceAll('\\', '/')],
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

/////////////////////////////////// FORUM CONTENT //////////////////////////////////////

app.post('/forumcontent', async (req, res) => {
  try {
    const {title, content, likes, comments, username, postdate} = req.body
    const newForumcontent = await pool.query(
      "INSERT INTO forumcontent (title, content, likes, comments, username, postdate) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, content, likes, comments, username, postdate]
    );

    res.json(newForumcontent.rows[0])
    
  } catch (err) {
    console.error(err.message)
  }
})

//get all forum threads

app.get('/forumcontent', async (req, res) => {
  try {
    const allForumcontent = await pool.query('SELECT * FROM forumcontent')
    res.json(allForumcontent.rows)
  } catch (err) {
    console.error(err.message)
  }
})
//get a forum thread

app.get('/forumcontent/:thread_id', async (req, res) => {
  try {
    const { id } = req.params
    const forumcontent = await pool.query(
      'SELECT * FROM forumcontent WHERE thread_id = $1',
      [id]
    )

    res.json(forumcontent.rows[0])
  } catch (err) {
    console.error(err.message)
  }
})

//update a forum thread

app.put('/forumcontent/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title } = req.body
    const updateForumucontent = await pool.query(
      'UPDATE forumcontent SET title = $1 WHERE thread_id = $2',
      [email, id]
    )

    res.json('Forumcontent was updated!')
  } catch (err) {
    console.error(err.message)
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

//////////////////////////////// FORUM COMMENTS ////////////////////////////////////////

app.post('/forumcomments', async (req, res) => {
  try {
    const { thread_id, comment, user, timeposted } = req.body
    const newForumcomment = await pool.query(
      'INSERT INTO forumcomments (thread_id, comment, username, timeposted) VALUES($1, $2, $3, $4) RETURNING *',
      [thread_id, comment, user, timeposted]
    )

    res.json(newForumcomment.rows[0])
  } catch (err) {
    console.error(err.message)
  }
})

//get forumcomments
app.get('/forumcomments/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params
    const forumcomments = await pool.query(
      'SELECT * FROM forumcomments WHERE thread_id = $1',
      [thread_id]
    )

    res.json(forumcomments.rows)
  } catch (err) {
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
                
                //Update the usage status of the code in the database
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
            // Friendship is already pending, update to accepted
            newStatus = 'accepted';
            const updateStatusQuery = `
                UPDATE friendships
                SET status = 'accepted'
                WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)
            `;
            await pool.query(updateStatusQuery, [users_id, friends_id]);
        } else {
            // Friendship is not pending, set to pending or accepted based on isRequest
            newStatus = isRequest ? 'pending' : 'accepted';
            const addFriendQuery = `
                INSERT INTO friendships (user_id1, user_id2, status)
                VALUES ($1, $2, 'pending');
            `
            await pool.query(addFriendQuery, [users_id, friends_id])
        }

        // Update the friendship status
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
  
