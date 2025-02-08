// src/components/messaging.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Container, Row, Col, ListGroup, Card, Form, Button } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import crypto from 'crypto-browserify'
import { Buffer } from 'buffer'
import socket from "../websocket/socket";

const Messaging = () => {
    const messageContainerRef = useRef(null);
    const [selectedUser, setSelectedUser] = useState(null)
    const [messageInput, setMessageInput] = useState('')
    const [messages, setMessages] = useState([])
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [listfriends, setListFriends] = useState([])
    const token = localStorage.getItem('token')
    const location = useLocation();
    const [config, setConfig] = useState(null)
    const usernotif = useMemo(() => location.state?.entityID || null, [location.state]);

    window.Buffer = Buffer;

    const handleUserSelection = (user) => {
        setSelectedUser(user)
        fetchMessageHistory(user.id)
    }
    
    const encrypt = (text) => {
        if (!config) {
            console.error('Config not defined');
            return '';
        }
        
        const key = Buffer.from(config.secretKey, 'hex');
        if (key.length !== 32) {
            console.error('Invald secret key length:', key.length);
            return '';
        }
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(config.algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    const decrypt = useCallback((text) => {
        if (!config) {
            console.error('Config not defined decrypt');
            return '';
        }

        const key = Buffer.from(config.secretKey, 'hex');
        if (key.length !== 32) {
            console.error('Invalid secret key length:', key.length);
            return '';
        }
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        console.log(text)
        console.log("config: ", config)
        console.log("key: ", key)
        console.log("iv: ", iv)
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
                console.log("Config: ", data)
                setConfig(data);
            }
        } catch (error) {
            console.error('Error fetching config: ', error);
        }
    }, [token])
    
    const fetchMessageHistory = useCallback((friendId) => {
        if (userid && friendId) {
            console.log(`Requesting message history for friendId: ${friendId}`);
            socket.emit('getMessageHistory', { userId: userid, friendId });
        }
    }, [userid]);

    const fetchFriendsList = useCallback(async () => {
        if (userid !== null && Number.isInteger(userid)) {
            try {
                const response = await fetch(`http://localhost:5000/all-friends/${userid}`);
                const data = await response.json();

                const fetchedUsers = data.map((friend) => ({
                    id: friend.friend_id,
                    name: friend.username,
                }));

                setListFriends(fetchedUsers);
            } catch (error) {
                console.error('Error fetching friends list:', error);
            }
        }
    }, [userid]);

    useEffect(() => {
        const fetchData = async () => {
            await fetchConfig();
            await authenticateUser();
            await fetchFriendsList();
        };
        fetchData();

        if (userid) {
            socket.emit('joinRoom', userid);
        }
    }, [authenticateUser, fetchConfig, fetchFriendsList, userid]);

    useEffect(() => {
        console.log("🔄 Setting up WebSocket listener for `messageHistory`...");

        console.log("🛠 Existing WebSocket Listeners:", socket._callbacks);

        const handleMessageHistory = (data) => {
            console.log("📩 Received `messageHistory` event:", data);

            if (!data || !data.messages || data.messages.length === 0) {
                console.warn("⚠️ No messages received from backend");
                return;
            }

            const { friendId, messages } = data;
            console.log(`📨 Processing messages for friendId: ${friendId}`, messages);
            console.log("config check: ", config)

            const decryptedMessages = messages.map(msg => ({
                ...msg,
                message_text: decrypt(`${msg.iv}:${msg.message_text}`)
            }));

            setMessages((prevMessages) => [
                ...prevMessages,
                { friendId, messages: decryptedMessages }
            ]);
        };

        socket.on('messageHistory', handleMessageHistory);

        return () => {
            console.log("🧹 Cleaning up WebSocket listener for `messageHistory`");
            socket.off('messageHistory', handleMessageHistory);
        };
    }, [socket, config]);

    useEffect(() => {
        if (!usernotif || listfriends.length === 0) return;

        const selectedUserFromNotif = listfriends.find(user => user.id === usernotif);
        if (selectedUserFromNotif) {
            setSelectedUser(selectedUserFromNotif);
        }
    }, [usernotif, listfriends]);

    useEffect(() => {
    socket.on("receiveMessage", (message) => {
        console.log("📩 Received message via WebSocket:", message);

        setMessages((prevMessages) => {
            return prevMessages.map(chat => {
                if (chat.friendId === message.sender_id || chat.friendId === message.receiver_id) {
                    return {
                        ...chat,
                        messages: [
                            ...chat.messages,
                            {
                                sender_id: message.sender_id,
                                message_text: decrypt(message.message_text),
                            },
                        ],
                    };
                }
                return chat;
            });
        });
    });

    return () => {
        socket.off("receiveMessage");
    };
}, [userid]);

    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = () => {
        if (selectedUser && messageInput.trim() !== "") {
            const encryptedMessage = encrypt(messageInput);

            const newMessage = {
                sender_id: userid,
                receiver_id: selectedUser.id,
                message_text: encryptedMessage,
                username: user,
            };

            socket.emit("sendMessage", newMessage);

            setMessageInput("");
        }
    };

    return (
      <Container fluid className='mt-5 messaging-page'>
      <Row className='h-100'>
        <Col sm={4} className='p-3 friends-list'>
          <h4 className='mb-3'>Friends</h4>
          <ListGroup variant='flush'>
            {listfriends.map((user) => (
              <ListGroup.Item
                key={user.id}
                action
                active={user === selectedUser}
                className='friend-item'
                onClick={() => handleUserSelection(user)}
              >
                {user.name}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
        <Col sm={8} className='p-3 chat-area'>
          {selectedUser ? (
            <Card className='h-100 chat-card'>
              <Card.Header className='d-flex justify-content-between align-items-center chat-header'>
                <Link
                  to={`/userprofile/${selectedUser.name}/${selectedUser.id}`}
                  className='text-decoration-none text-dark'
                >
                  {selectedUser.name}
                </Link>
              </Card.Header>
              <Card.Body className='chat-body'>
                <div ref={messageContainerRef} className='messages-container'>
                  {messages
                    .find((friendMessages) => friendMessages.friendId === selectedUser.id)
                    ?.messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`message ${
                          msg.sender_id === userid ? 'sent' : 'received'
                        }`}
                      >
                        <p className='mb-0'>{msg.message_text}</p>
                      </div>
                    ))}
                </div>
              </Card.Body>
              <Card.Footer className='chat-footer'>
                <Form className='d-flex'>
                  <Form.Control
                    type='text'
                    placeholder='Type your message...'
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className='me-2'
                  />
                  <Button variant='primary' onClick={handleSendMessage}>
                    Send
                  </Button>
                </Form>
              </Card.Footer>
            </Card>
          ) : (
            <div className='d-flex justify-content-center align-items-center h-100'>
              <p className='text-center'>Select a user to start chatting</p>
            </div>
          )}
        </Col>
      </Row>
    </Container>
    )
}

export default Messaging
