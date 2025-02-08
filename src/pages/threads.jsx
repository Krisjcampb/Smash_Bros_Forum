import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Container, Row } from 'react-bootstrap';
import { Form } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import UserComments from '../components/User Comments/UserComments';

function Threads() {
  const [comment, setComment] = useState("");
  const paramThreadId = useParams();
  const location = useLocation();
  const [forumContent, setForumContent] = useState(location.state?.forumContent);
  const [user, setUser] = useState("");
  const [userid, setUserId] = useState("");
  const [userrole, setUserRole] = useState("");
  const thread_id = forumContent?.thread_id || paramThreadId;

  const onSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const timeposted = new Date().toISOString();
      const body = { thread_id, comment, user, timeposted, userid };
      console.log(timeposted)
      const response = await fetch('http://localhost:5000/forumcomments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      console.log(response);
    } catch (err) {
      console.log(err.message);
    }
  };

  useEffect(() => {
    console.log(forumContent)
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/userauthenticate', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          const { id, name, role } = data;
          setUser(name);
          setUserId(id);
          setUserRole(role);
        })
        .catch((error) => {
          console.error('Error fetching user role:', error);
        });
        console.log("Retrieved Data: ", forumContent)

        if(forumContent === undefined) {
            fetch(`http://localhost:5000/forumcontent/${thread_id.threadId}`, {
                method: 'GET',
                headers: {'Content-Type': 'application/json',}
            })
            .then((response) => response.json())
            .then((data) => {
                setForumContent(data)
                console.log("thread data: ", data)
            })
            .catch((error) => {
                console.error('Error fetching forum content:', error);
            })
        }
    }
  }, [forumContent, thread_id.threadId]);


  return (
    <Container>
        {!forumContent ? (
            <div className="text-center">Loading...</div>
        ) : (
            <>
            <div className="h4 text-center mb-32 mt-24">{forumContent.title}</div>
            <Row>
                <div className="text-right pb-64">{forumContent.content}</div>
            </Row>
            <Row>
                <Form title={user}>
                <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
                    <Form.Label>Comment</Form.Label>
                    <Form.Control
                    as="textarea"
                    rows={5}
                    type="text"
                    placeholder="Comment Here"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    />
                    <Button type="submit" onClick={onSubmitForm}>
                    Post
                    </Button>
                </Form.Group>
                </Form>
            </Row>
            <Container>
                {forumContent && (
                <UserComments
                    userRole={userrole}
                    userId={userid}
                    forumContent={forumContent}
                />
                )}
            </Container>
            </>
        )}
        </Container>
  );
}
export default Threads;
