// src/components/MessagingPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Container, Row, Col, ListGroup, Card, Form, Button } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import crypto from 'crypto-browserify'
import { Buffer } from 'buffer'

const Messaging = () => {
    const [selectedUser, setSelectedUser] = useState(null)
    const [messageInput, setMessageInput] = useState('')
    const [messages, setMessages] = useState([])
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [listfriends, setListFriends] = useState([])
    const token = localStorage.getItem('token')
    const location = useLocation();
    const [config, setConfig] = useState(null) // Initializing config as null
    const usernotif = useMemo(() => location.state?.entityID || null, [location.state]);

    window.Buffer = Buffer;

    const handleUserSelection = (user) => {
        setSelectedUser(user)
    }
    
    const encrypt = (text) => {
        if (!config) {
            console.error('Config not defined');
            return '';
        }
        
        const key = Buffer.from(config.secretKey, 'hex');
        if (key.length !== 32) {
            console.error('Invalid secret key length:', key.length); // Log invalid key length
            return '';
        }
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(config.algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    const decrypt = useCallback((text) => {
        if (!config) {
            console.error('Config not defined');
            return '';
        }

        const key = Buffer.from(config.secretKey, 'hex');
        if (key.length !== 32) {
            console.error('Invalid secret key length:', key.length); // Log invalid key length
            return '';
        }
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(config.algorithm, key, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
        return decrypted.toString();
    }, [config])

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

    const fetchConfig = useCallback(async () => {
        try{
            if(token) {
                const response = await fetch('http://localhost:5000/config', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                })
                if (!response.ok) {
                    throw new Error('Failed to fetch config');
                }
                const data = await response.json();
                setConfig(data);
            }
        } catch (error) {
            console.error('Error fetching config: ', error);
        }
    }, [token])

    const handleSendMessage2 = useCallback(async () => {
        if(userid !== null && Number.isInteger(userid) && config){
            try {
              const response = await fetch(
                `http://localhost:5000/all-friends/${userid}`
              )
              const data = await response.json()

              const fetchedUsers = data.map((friend) => ({
                id: friend.friend_id,
                name: friend.username,
              }))
              setListFriends(fetchedUsers)

              const messagesSorted = data.map(async (friend) => {
                const friendId = friend.friend_id
                const msgresponse = await fetch(
                  `http://localhost:5000/retrieve-messages/${userid}/${friendId}`
                )
                console.log("Handle send message2 ", config)

                const datamsg = await msgresponse.json()
                const decryptedMessages = datamsg.map(msg => ({
                    ...msg,
                    message_text: decrypt(msg.iv + ":" + msg.message_text)
                }));

                return { friendId, messages: decryptedMessages }
              })
              const allMessages = await Promise.allSettled(messagesSorted)
              const orderedMessages = allMessages
                .filter(({ status }) => status === 'fulfilled')
                .map(({ value }) => value)

              setMessages(orderedMessages)
            } catch (error) {
                console.error('Error fetching friendship status:', error)
                console.log(error.message)
            }
        }
    }, [userid, decrypt, config])

    useEffect(() => {
        const fetchData = async () => {
            await authenticateUser()
            await fetchConfig()
        }
        fetchData();
    }, [authenticateUser, fetchConfig])

    useEffect(() => {
        if(config) {
            handleSendMessage2();
        }
    }, [config, handleSendMessage2])

    useEffect(() => {
        if (usernotif && listfriends.length > 0) {
            const selectedUserFromNotif = listfriends.find(user => user.id === usernotif);
            if (selectedUserFromNotif) {
                setSelectedUser(selectedUserFromNotif);
            }
        }
    }, [usernotif, listfriends]);

    const handleSendMessage = () => {
        if (selectedUser && messageInput.trim() !== '') 
        {
            const encryptedMessage = encrypt(messageInput);
            const newMessage = {
                friendId: selectedUser.id,
                messages: [
                    {
                    sender_id: userid,
                    message_text: encryptedMessage,
                    },
                ],
            }
            console.log('Before update:', messages);
            setMessages((prevMessages) => [...prevMessages, newMessage])
            setMessageInput('')
            console.log('After update:', messages);
            
            const sendMessageToBackend = async () => {
                try {
                    const response = await fetch('http://localhost:5000/send-message',{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            sender_id: userid,
                            receiver_id: selectedUser.id,
                            message_text: encryptedMessage,
                            username: user,
                        }),
                    });
                    console.log(response)
                }
                catch (error) {
                    console.error('Error sending message to the backend:', error);
                }
            }
            sendMessageToBackend();
            handleSendMessage2();
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
                <Card.Header>
                    <Link to={`/userprofile/${selectedUser.name}/${selectedUser.id}`} className="text-decoration-none text-dark">{selectedUser.name}
                    </Link>
                    </Card.Header>
                <Card.Body>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {messages.find((friendMessages) => friendMessages.friendId === selectedUser.id)?.messages.map((msg, index) => (
                      <p key={index}>
                        <strong>{msg.sender_id === userid ? 'You' : selectedUser.name}:</strong> {msg.message_text}
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
