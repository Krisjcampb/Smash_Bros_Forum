const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db")
const multer = require('multer')

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
//update a forum thread

app.put("/forumusers/:id", async (req, res) => {
    try {
        const {id} = req.params;
        const {email} = req.body;
        const updateForumusers = await pool.query("UPDATE forumusers SET email = $1 WHERE users_id = $2",
        [email, id]
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
    const { thread_id, comment, username, timeposted } = req.body
    const newForumcomment = await pool.query(
      'INSERT INTO forumcomments (thread_id,comment, username, timeposted) VALUES($1, $2, $3, $4) RETURNING *',
      [thread_id, comment, username, timeposted]
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