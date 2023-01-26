const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db")

//middleware
app.use(cors());
app.use(express.json()); //req.body

//ROUTES//

//USERS ACCOUNT
//create a user
app.post("/forumusers", async(req, res) => {
    try{
        const {username, email, password} = req.body;
        const newForumusers = await pool.query(
            "INSERT INTO forumusers (username, email, password) VALUES($1, $2, $3) RETURNING *", 
            [username, email, password]
        );

        res.json(newForumusers.rows[0])

    }catch (err){
        console.error(err.message);
    }
})
//get all forum threads

app.get("/forumusers", async(req, res) => {
    try{
        const allUsers = await pool.query("SELECT * FROM forumusers")
        res.json(allUsers.rows);
    }
    catch (err) {
        console.error(err.message)
    }
})
//get a forum thread

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

/////////////////////////////////// FORUM CONTENT //////////////////////////////////////

app.post('/forumcontent', async (req, res) => {
  try {
    const {title, content, likes, comments, username, img} = req.body
    const newForumcontent = await pool.query(
      "INSERT INTO forumcontent (title, content, likes, comments, username, img) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, content, likes, comments, username, img]
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

app.get('/forumcontent/:id', async (req, res) => {
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


app.listen(5000, () => {
    console.log("server has started on port 5000");

});