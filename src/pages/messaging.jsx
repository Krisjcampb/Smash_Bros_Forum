// src/components/MessagingPage.js
import React, { useState, useEffect, useCallback } from 'react'
import {
    Container,
    Row,
    Col,
    ListGroup,
    Card,
    Form,
    Button,
} from 'react-bootstrap'

const Messaging = () => {
    const [selectedUser, setSelectedUser] = useState(null)
    const [messageInput, setMessageInput] = useState('')
    const [messages, setMessages] = useState([])
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [listfriends, setListFriends] = useState([])
    const token = localStorage.getItem('token')

    const handleUserSelection = (user) => {
        setSelectedUser(user)
    }
    
    const authenticateUser = useCallback(async () => {
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
    }, [token])

    const handleSendMessage2 = useCallback(async () => {
        if(userid !== null && Number.isInteger(userid)){
            console.log(userid)
            try {
                const response = await fetch(`http://localhost:5000/all-friends/${userid}`)
                const data = await response.json()
                console.log(data)
                if(Array.isArray(data)){
                    const fetchedUsers = data.map(friend => ({id: friend.friend_id, name: friend.username}))
                    console.log(fetchedUsers)
                    setListFriends(fetchedUsers)
                }
            } catch (error) {
                console.error('Error fetching friendship status:', error)
                console.log(error.message)
            }
        }
    }, [userid])

    useEffect(() => {
        const fetchData = async () => {
            await authenticateUser()
            await handleSendMessage2()
        }
        fetchData();
    }, [userid, handleSendMessage2, authenticateUser])

    const handleSendMessage = () => {
        if (selectedUser && messageInput.trim() !== '') {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: 'You', text: messageInput },
        ])
        setMessageInput('')
        }
    }

    return (
      <Container className='mt-5'>
        <div>{user}</div>
        <Row>
          <Col sm={4}>
            <ListGroup>
              {listfriends.map((user) => (
                <ListGroup.Item
                  key={user.id}
                  action
                  active={user === selectedUser}
                  onClick={() => handleUserSelection(user)}
                >
                  {user.name}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>
          <Col sm={8}>
            {selectedUser ? (
              <Card>
                <Card.Header>{selectedUser.name}</Card.Header>
                <Card.Body>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {messages.map((msg, index) => (
                      <p key={index}>
                        <strong>{msg.sender}:</strong> {msg.text}
                      </p>
                    ))}
                  </div>
                  <Form className='mt-3'>
                    <Form.Group controlId='messageInput'>
                      <Form.Control
                        type='text'
                        placeholder='Type your message...'
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                      />
                    </Form.Group>
                    <Button variant='primary' onClick={handleSendMessage}>
                      Send
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            ) : (
              <p className='text-center mt-5'>
                Select a user to start chatting
              </p>
            )}
          </Col>
        </Row>
      </Container>
    )
}

export default Messaging
