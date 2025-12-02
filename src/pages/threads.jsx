import React from 'react';
import { useLocation, useParams, NavLink } from 'react-router-dom';
import { Container, Row } from 'react-bootstrap';
import { Form } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import UserComments from '../components/User Comments/UserComments';

function Threads() {
    const [comment, setComment] = useState("");
    const { threadId } = useParams();
    const location = useLocation();
    const [forumContent, setForumContent] = useState(location.state?.forumContent);
    const [user, setUser] = useState("");
    const [userid, setUserId] = useState("");
    const [userrole, setUserRole] = useState("");
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionPosition, setMentionPosition] = useState(0);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [activeMentionIndex, setActiveMentionIndex] = useState(-1);
    const [mentions, setMentions] = useState([]);
    const [commentsKey, setCommentsKey] = useState(0);
    const thread_id = forumContent?.thread_id || threadId

    const fetchUsersForMentions = async (username) => {
        try {
            const response = await fetch(
            `http://localhost:5000/forumusers/get-user/${encodeURIComponent(username)}`
            );
            
            if (!response.ok) {
            throw new Error('Failed to fetch users');
            }
            
            const users = await response.json();
            setAvailableUsers(users);
            console.log("users: ", users)
        } catch (err) {
            console.error('Error fetching mention users:', err);
            setAvailableUsers([]);
        }
    };

    const handleCommentChange = (e) => {
        const text = e.target.value;
        setComment(text);
        
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        
        // Find the last @ not followed by whitespace
        const atPos = textBeforeCursor.lastIndexOf('@');
        const spaceAfterAt = textBeforeCursor.indexOf(' ', atPos);
        
        if (atPos > -1 && (spaceAfterAt === -1 || spaceAfterAt > cursorPos)) {
            const query = textBeforeCursor.substring(atPos + 1, cursorPos);
            setMentionPosition(atPos);
            setMentionQuery(query);
            
            if (query.length > 0) {
            fetchUsersForMentions(query);
            setShowMentionDropdown(true);
            } else {
            setShowMentionDropdown(false);
            }
        } else {
            setShowMentionDropdown(false);
        }
    };
    
    const handleSelectMention = (username) => {
        const mentionText = `@${username}`;
        
        const cursorPos = mentionPosition + mentionQuery.length + 1;
        
        const textBefore = comment.substring(0, mentionPosition);
        const textAfter = comment.substring(cursorPos);
        
        const newText = `${textBefore}${mentionText} ${textAfter}`;
        
        const newCursorPos = mentionPosition + mentionText.length + 1;
        
        setComment(newText);
        setMentions([...mentions, {
            position: mentionPosition,
            length: mentionText.length,
            username
        }]);
        
        setShowMentionDropdown(false);
        setMentionQuery('');
        
        setTimeout(() => {
            const textarea = document.querySelector('textarea');
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const renderCommentWithMentions = (text, mentions = []) => {
        if (!mentions.length) return text;

        let elements = [];
        let lastPos = 0;

        mentions.forEach((m, i) => {
            if (m.position > lastPos) {
            elements.push(text.substring(lastPos, m.position));
            }
            
            elements.push(
            <span key={i} className="mention-highlight">
                {text.substring(m.position, m.position + m.length)}
            </span>
            );
            
            lastPos = m.position + m.length;
        });

        if (lastPos < text.length) {
            elements.push(text.substring(lastPos));
        }
        
        return elements;
        };

    const handleKeyDown = (e) => {
        if (showMentionDropdown) {
            if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveMentionIndex(prev => Math.min(prev + 1, availableUsers.length - 1));
            } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveMentionIndex(prev => Math.max(prev - 1, -1));
            } else if (e.key === 'Enter' && activeMentionIndex >= 0) {
            e.preventDefault();
            handleSelectMention(availableUsers[activeMentionIndex].username);
            } else if (e.key === 'Escape') {
            setShowMentionDropdown(false);
            }
        }
    };

    const onSubmitForm = async (e) => {
        e.preventDefault();
        try {
            const timeposted = new Date().toISOString();
            const body = { 
            thread_id, 
            comment, 
            user: user,
            userid: userid,
            timeposted,
            mentions: mentions.map(m => ({
                position: m.position,
                length: m.length,
                username: m.username
            }))
            };
            console.log("Body: ", body)
            const response = await fetch('http://localhost:5000/forumcomments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                setComment('');
                setMentions([]);
                setCommentsKey(prev => prev + 1);
            } else {
                const errorData = await response.json();
                console.error('Posting failed:', errorData.message);
            }
        } catch (err) {
            console.error('Error submitting comment:', err.message);
        }
    };

    useEffect(() => {
        const usernames = mentions.map(obj => obj.username);
        console.log("Current User: ", usernames)
        console.log("Thread ID: ", thread_id)
    })

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

            if (!forumContent) {
                fetch(`http://localhost:5000/forumcontent/${thread_id}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(res => res.json())
                .then(data => {
                    setForumContent(data);
                    console.log("Fetched thread data:", data);
                })
                .catch(err => console.error("Error fetching forum content:", err));
            }
        }
        console.log("forum content: ",forumContent)
    }, [forumContent, thread_id.threadId, thread_id]);


    return (
<>
  <Container>
  {!forumContent ? (
    <div className="text-center">Loading...</div>
  ) : (
    <>
      <div className="h4 text-center mb-32 mt-24">{forumContent.title}</div>

      <Row>
        <img src={forumContent?.filepath ? forumContent.filepath.slice(6) : ""} className='ps-64 pe-64' alt='Thread' style={{ display: "block",
    margin: "0 auto", maxWidth: "1000px", maxHeight: "500px", objectFit: "cover" }}/>
        <div className="mx-auto pb-32 pt-40" style={{ maxWidth: '1200px', textAlign: 'left' }}>
          {forumContent.content}
        </div>
      </Row>

      <Row>
        <div className="mx-auto" style={{ maxWidth: '1200px' }}>
          {user ? (
            // ✅ Show comment form if user is signed in
            <Form>
              <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1" style={{ position: 'relative' }}>
                <Form.Control
                  as="textarea"
                  rows={5}
                  type="text"
                  placeholder="Comment Here"
                  value={comment}
                  onChange={handleCommentChange}
                  onKeyDown={handleKeyDown}
                />
                {showMentionDropdown && (
                  <div className="mention-dropdown">
                    {availableUsers.length > 0 ? (
                      availableUsers.map((user, index) => (
                        <div
                          key={user.id}
                          className={`mention-item ${index === activeMentionIndex ? 'active-mention' : ''}`}
                          onClick={() => handleSelectMention(user.name)}
                          onMouseEnter={() => setActiveMentionIndex(index)}
                        >
                          <div className="d-flex align-items-center">
                            <img
                              src={`/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${user.character_name}/chara_0_${user.character_name.toLowerCase()}_0${user.selected_skin}.png`}
                              alt={user.name}
                              className="rounded-circle me-2"
                              width="32"
                              height="32"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/path/to/default/profile_image.png';
                              }}
                            />
                            <div style={{ lineHeight: 1.2 }}>
                              <div className="username fw-semibold fs-7 ms-4">{user.name}</div>
                              <div className="text-muted small ms-4">{user.role || 'Member'}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="mention-item text-muted">No users found</div>
                    )}
                  </div>
                )}
                <Button type="submit" onClick={onSubmitForm}>
                  Post
                </Button>
              </Form.Group>
            </Form>
          ) : (
            <div className="text-center thread-signin mt-4 pb-8 pt-8 mx-auto">
              <p>You must be signed in to post a comment.</p>
              <NavLink to="/signin">
                <Button variant="primary">Sign In</Button>
              </NavLink>
            </div>
          )}
        </div>
      </Row>

      <Container>
        <UserComments
          key={commentsKey}
          userRole={userrole}
          userId={userid}
          forumContent={forumContent}
          renderMentions={renderCommentWithMentions}
        />
      </Container>
    </>
  )}
</Container>
</>
    );
}
export default Threads;
