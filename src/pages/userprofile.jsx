import React, {useState, useEffect} from 'react'
import Button from 'react-bootstrap/Button'
import { Container} from 'react-bootstrap'
import { useParams } from 'react-router-dom';

function Userprofile() {
    const [initiatedByCurrentUser, setInitiatedByCurrentUser] = useState(false)
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [friendshipStatus, setFriendshipStatus] = useState(null)
    const { friendid } = useParams();
    const token = localStorage.getItem('token')

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
    }, [userid, friendid, initiatedByCurrentUser]);

    return (
      <Container>
        {friendshipStatus === 'pending' && (
            <div>
                {initiatedByCurrentUser ? (
                    <p>Friend Request Pending</p>
                ) : (
                    <Button onClick={handleFriendAction}>Accept Friend Request</Button>
                )}
            </div>
        )}
        {friendshipStatus !== 'pending' && (
            <div>
                <Button onClick={handleFriendAction}>
                    {friendshipStatus === 'accepted' ? 'Friend' : 'Add Friend'}
                </Button>
            </div>
        )}
        <div>{friendid}</div>
      </Container>
    )
}

export default Userprofile
