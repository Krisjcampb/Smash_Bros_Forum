import React, {useState, useEffect} from 'react'
import Button from 'react-bootstrap/Button'
import ListGroup from 'react-bootstrap/ListGroup';
import { Container, Image, Tabs, Tab } from 'react-bootstrap'
import { useParams, useNavigate } from 'react-router-dom';
import FriendOptionsDropdown from '../components/Friend Dropdown/Friend_Dropdown'
import { NavLink } from 'react-router-dom'

function Userprofile() {
    const [initiatedByCurrentUser, setInitiatedByCurrentUser] = useState(false)
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [friendshipStatus, setFriendshipStatus] = useState(null)
    const { friendid } = useParams();
    const [posts, setPosts] = useState([]);
    const [comments, setComments] = useState([]);
    const [likes, setLikes] = useState([]);
    const token = localStorage.getItem('token')
    const navigate = useNavigate()

    const currentuserstatus = () => {
        console.log(initiatedByCurrentUser)
    }

    const handleFriendAction = async () => {
        try {
            if (friendshipStatus === 'pending') {
                await fetch(`http://localhost:5000/add-friend/${userid}/${friendid}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                setFriendshipStatus('accepted');
            } else {
                await fetch(`http://localhost:5000/add-friend/${userid}/${friendid}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                        body: JSON.stringify({ isRequest: true }),
                });
                setFriendshipStatus('pending');
            }
        } catch (error) {
            console.error('Error handling friend action:', error);
        }
    };

    const handleRemoveFriend = async () => {
        try {
            await fetch(`http://localhost:5000/remove-friend/${userid}/${friendid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.error('Error handling friend action:', error);
        }
        setFriendshipStatus(null)
        setInitiatedByCurrentUser(true)
    }
    const handleDirectMessage = () => {
        navigate(`/messaging/${user}/${userid}`)
    }
    const handleBlockFriend = () => {

    }

    useEffect(() => {
        if(token) {
            fetch('http://localhost:5000/userauthenticate', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
            })
            .then(response => response.json())
            .then(data => {
                const { id, name } = data;
                setUserId(id);
                setUser(name);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
        }
    }, [user, token])

    useEffect(() => {
        if(userid && friendid) {
            const fetchFriendshipStatus = async () => {
                try {
                    const response = await fetch(
                    `http://localhost:5000/get-friendship-status/${userid}/${friendid}`
                    )
                    const data = await response.json()
                    setFriendshipStatus(data.status.status)
                    const requestid = parseInt(data.userid, 10)
                    setInitiatedByCurrentUser(requestid === userid)
                } catch (error) {
                    console.error("Error fetching friendship status:", error);
                }
            };
            fetchFriendshipStatus();
        }
        if(userid) {
            const fetchUserComments = async () => {
                try {
                    const response = await fetch(`http://localhost:5000/usercomments/${userid}`)
                    const data = await response.json()
                    setComments(data)
                    console.log(comments)
                }catch (error) {
                    console.error("Error fetching user comments:", error);
                }
            }
            fetchUserComments();
        }
    }, [userid, friendid, initiatedByCurrentUser]);

    return (
      <Container>
        {friendshipStatus === 'pending' && (
          <div>
            {initiatedByCurrentUser ? (
              <p>Friend Request Pending</p>
            ) : (
              <Button onClick={handleFriendAction}>
                Accept Friend Request
              </Button>
            )}
          </div>
        )}
        {friendshipStatus !== 'pending' && (
          <div>
            {friendshipStatus === 'accepted' ? (
              <FriendOptionsDropdown
                onRemoveFriend={handleRemoveFriend}
                onDirectMessage={handleDirectMessage}
                onBlockFriend={handleBlockFriend}
              />
            ) : (
              <Button onClick={handleFriendAction}>Add Friend</Button>
            )}
          </div>
        )}
        <div>{friendid}</div>
        <Button onClick={currentuserstatus}>User Status</Button>
        <div className="profile-header">
            <Image src={user.profileImage} alt="User Profile" roundedCircle />
            <h2>{user.username}</h2>
            <p>{user.description}</p>
        </div>

      <Tabs defaultActiveKey="posts" id="user-profile-tabs">
        <Tab eventKey="posts" title="Posts">
          {/* Display user's posts */}
          {posts.map(post => (
            <div key={post.id}>
              <h3>{post.title}</h3>
              <p>{post.content}</p>
            </div>
          ))}
        </Tab>
        <Tab eventKey="comments" title="Comments">
            <ListGroup>
            {comments.map(comment => (
                <NavLink to={`/threads/${comment.thread_id}`} className='nav-link' state={comment}>
                    <ListGroup.Item key={comment.id}>
                        <div>
                            <p><strong>{comment.thread_id}</strong></p>
                            <p><strong>{comment.username}:</strong> {comment.comment}</p>
                        </div>
                    </ListGroup.Item>
                </NavLink>
            ))}
            </ListGroup>
        </Tab>
        <Tab eventKey="likes" title="Likes">
          {/* Display user's liked posts */}
          {likes.map(like => (
            <div key={like.postId}>
              <p>Liked post: {like.postTitle}</p>
            </div>
          ))}
        </Tab>
      </Tabs>
      </Container>
    )
}

export default Userprofile
