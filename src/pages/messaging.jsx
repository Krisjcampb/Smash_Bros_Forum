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
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [messages, setMessages] = useState([])
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [listfriends, setListFriends] = useState([])
    const token = localStorage.getItem('token')
    const location = useLocation();
    const [config, setConfig] = useState(null)
    const messageRefs = useRef({});
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
        // console.log(text)
        // console.log("config: ", config)
        // console.log("key: ", key)
        // console.log("iv: ", iv)
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
        const handleClickOutside = (event) => {
            // If we have a selected message and the click is outside that message div
            if (
            selectedMessageId &&
            messageRefs.current[selectedMessageId] &&
            !messageRefs.current[selectedMessageId].contains(event.target)
            ) {
            setSelectedMessageId(null);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [selectedMessageId]);

    useEffect(() => {
        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
        });

        return () => {
            socket.off("connect");
        };
    }, []);
    
    useEffect(() => {
        if (selectedUser && userid) {
            const sorted = [userid, selectedUser.id].sort((a, b) => a - b);
            console.log("Emitting joinRoom with:", { userId: sorted[0], friendId: sorted[1] });
            socket.emit("joinRoom", { userId: sorted[0], friendId: sorted[1] });
            
            // Fetch message history after joining the room
            setTimeout(() => {
                fetchMessageHistory(selectedUser.id);
            }, 100); // Small delay to ensure room is joined
        }
    }, [selectedUser, userid, fetchMessageHistory]);

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
        const handleMessageHistory = (data) => {
            console.log("📩 Received `messageHistory` event:", data);

            if (!data || !data.messages || data.messages.length === 0) {
                console.warn("⚠️ No messages received from backend");
                return;
            }

            const { friendId, messages } = data;
            
            const decryptedMessages = messages.map(msg => ({
                ...msg,
                message_text: decrypt(`${msg.iv}:${msg.message_text}`)
            }));

            setMessages(prevMessages => {
                const existingChatIndex = prevMessages.findIndex(
                    chat => chat.friendId === friendId
                );
                
                if (existingChatIndex !== -1) {
                    const existingMessages = prevMessages[existingChatIndex].messages;
                    const newMessages = decryptedMessages.filter(
                        newMsg => !existingMessages.some(existingMsg => 
                            existingMsg.message_id === newMsg.message_id
                        )
                    );
                    
                    return prevMessages.map((chat, index) =>
                        index === existingChatIndex
                            ? { ...chat, messages: [...chat.messages, ...newMessages] }
                            : chat
                    );
                } else {
                    return [...prevMessages, { friendId, messages: decryptedMessages }];
                }
            });
        };

        socket.on('messageHistory', handleMessageHistory);

        return () => {
            console.log("🧹 Cleaning up WebSocket listener for `messageHistory`");
            socket.off('messageHistory', handleMessageHistory);
        };
    }, [config, decrypt]);

    useEffect(() => {
        if (!usernotif || listfriends.length === 0) return;

        const selectedUserFromNotif = listfriends.find(user => user.id === usernotif);
        if (selectedUserFromNotif) {
            setSelectedUser(selectedUserFromNotif);
        }
    }, [usernotif, listfriends]);

    useEffect(() => {
        console.log("Attaching socket listeners...");

        const handleReceive = (message) => {
            console.log("Received message:", message);
            
            if (message.sender_id === userid) return;
            
            const decryptedMessage = {
            message_id: message.message_id,
            sender_id: message.sender_id,
            message_text: decrypt(message.message_text),
            is_deleted: false,
            };

            setMessages((prevMessages) => {
            const chatIndex = prevMessages.findIndex(
                (chat) =>
                chat.friendId === message.sender_id ||
                chat.friendId === message.receiver_id
            );

            if (chatIndex !== -1) {
                return prevMessages.map((chat, index) =>
                index === chatIndex
                    ? { ...chat, messages: [...chat.messages, decryptedMessage] }
                    : chat
                );
            } else {
                const friendId =
                message.sender_id === userid
                    ? message.receiver_id
                    : message.sender_id;

                return [...prevMessages, { friendId, messages: [decryptedMessage] }];
            }
            });
        };

    const handleDelete = ({ message_id, sender_id, receiver_id }) => {
        setMessages((prevMessages) =>
        prevMessages.map((chat) => {
            if (chat.friendId === sender_id || chat.friendId === receiver_id) {
            return {
                ...chat,
                messages: chat.messages.map((msg) =>
                msg.message_id === message_id
                    ? { ...msg, is_deleted: true }
                    : msg
                ),
            };
            }
            return chat;
        })
        );
    };

    socket.on("receiveMessage", handleReceive);
    socket.on("deleteMessage", handleDelete);

  return () => {
    socket.off("receiveMessage", handleReceive);
    socket.off("deleteMessage", handleDelete);
  };
}, [decrypt, userid]);

    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = () => {
        const sorted = [userid, selectedUser.id].sort((a, b) => a - b);
        const room = `dm-${sorted[0]}-${sorted[1]}`;

        if (selectedUser && messageInput.trim() !== "") {
            const encryptedMessage = encrypt(messageInput);

            setMessageInput("");

            // Then send the actual encrypted message
            socket.emit("sendMessage", {
                room,
                sender_id: userid,
                receiver_id: selectedUser.id,
                message_text: encryptedMessage,
                username: user,
            });
        }
    };

    useEffect(() => {
        const handleMessageSent = (message) => {
            setMessages((prevMessages) => {
                // 1. Decrypt the server's message
                const decryptedMessage = {
                    ...message,
                    message_text: decrypt(message.message_text),
                    is_deleted: false,
                };

                // 2. Find and replace the temporary message
                return prevMessages.map((chat) => {
                    if (chat.friendId === message.sender_id || chat.friendId === message.receiver_id) {
                        // Filter out any temporary message
                        const filteredMessages = chat.messages.filter(
                            msg => !(msg.message_id > Date.now() - 10000 && msg.sender_id === userid)
                        );
                        
                        return {
                            ...chat,
                            messages: [...filteredMessages, decryptedMessage],
                        };
                    }
                    return chat;
                });
            });
        };

        socket.on("messageSent", handleMessageSent);
        return () => socket.off("messageSent", handleMessageSent);
    }, [decrypt, userid]);

    const handleDeleteMessage = (messageId) => {
        socket.emit("deleteMessage", { messageId });
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
                <Col sm={8} className='p-3 chat-area' >
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
                            ref={(el) => (messageRefs.current[msg.message_id] = el)}
                            className={`message ${msg.sender_id === userid ? 'sent' : 'received'}`}
                            onClick={() => setSelectedMessageId(msg.message_id)}
                            >
                            <p className='mb-0'>
                                {msg.is_deleted ? <i>Deleted Message</i> : msg.message_text}
                            </p>

                            {selectedMessageId === msg.message_id &&
                                msg.sender_id === userid &&
                                !msg.is_deleted && (
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="mt-1"
                                    onClick={(e) => {
                                    e.stopPropagation(); // stop from selecting the message again
                                    handleDeleteMessage(msg.message_id);
                                    }}
                                >
                                    Delete
                                </Button>
                                )}
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
