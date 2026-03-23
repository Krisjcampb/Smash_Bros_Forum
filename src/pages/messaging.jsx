import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Container, Row, Col, ListGroup, Card, Form, Button } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import socket from "../websocket/socket";
import forge from 'node-forge';
import { API } from '../components/Utilities/apiUrl';

const Messaging = () => {
    const messageContainerRef = useRef(null);
    const [selectedUser, setSelectedUser] = useState(null)
    const [messageInput, setMessageInput] = useState('')
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [messages, setMessages] = useState([])
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState(null)
    const [listfriends, setListFriends] = useState([])
    const token = localStorage.getItem('token')
    const location = useLocation();
    const messageRefs = useRef({});
    const usernotif = useMemo(() => location.state?.entityID || null, [location.state]);

    // Stores plaintext by tempKey while waiting for the servers messageSent confirmation
    const pendingPlaintexts = useRef({});

    // Derive the senders public key locally rather than fetching it from the server
    const getSenderPublicKey = () => {
        const privateKeyPem = sessionStorage.getItem('privateKey');
        if (!privateKeyPem) throw new Error('Private key not found in localStorage');
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        return forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
    };

    const fetchRecipientPublicKey = useCallback(async (recipientId) => {
        const response = await fetch(`${API}/get-public-key/${recipientId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch recipient public key');
        const { publicKey } = await response.json();
        return forge.pki.publicKeyFromPem(publicKey);
    }, [token]);

    const encrypt = useCallback(async (plaintext, recipientId) => {
        const recipientPublicKey = await fetchRecipientPublicKey(recipientId);
        const senderPublicKey = getSenderPublicKey();

        const aesKey = forge.random.getBytesSync(32);
        const iv = forge.random.getBytesSync(12);

        const cipher = forge.cipher.createCipher('AES-GCM', aesKey);
        cipher.start({ iv });
        cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
        cipher.finish();
        const ciphertext = cipher.output.getBytes();
        const tag = cipher.mode.tag.getBytes();

        const ciphertextWithTag = ciphertext + tag;

        const encryptedForSender = senderPublicKey.encrypt(aesKey, 'RSA-OAEP');
        const encryptedForRecipient = recipientPublicKey.encrypt(aesKey, 'RSA-OAEP');

        return [
            forge.util.encode64(encryptedForSender),
            forge.util.encode64(encryptedForRecipient),
            forge.util.encode64(iv),
            forge.util.encode64(ciphertextWithTag)
        ].join('|');
    }, [fetchRecipientPublicKey]);

    const decrypt = useCallback((payload, senderId) => {
        try {
            const privateKeyPem = sessionStorage.getItem('privateKey');
            if (!privateKeyPem) return '[Private key missing — upload your key in Settings]';

            const parts = payload.split('|');
            if (parts.length !== 4) return '[Invalid message format]';

            const [senderKeyB64, recipientKeyB64, ivB64, ciphertextB64] = parts;

            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

            // Pick whichever copy of the AES key was encrypted for us
            const encryptedAESKeyB64 = senderId === userid ? senderKeyB64 : recipientKeyB64;
            const encryptedAESKey = forge.util.decode64(encryptedAESKeyB64);

            const aesKey = privateKey.decrypt(encryptedAESKey, 'RSA-OAEP');

            const iv = forge.util.decode64(ivB64);
            const ciphertextWithTag = forge.util.decode64(ciphertextB64);

            // Last 16 bytes are the GCM authentication tag
            const ciphertext = ciphertextWithTag.slice(0, -16);
            const tag = ciphertextWithTag.slice(-16);

            const decipher = forge.cipher.createDecipher('AES-GCM', aesKey);
            decipher.start({ iv, tag: forge.util.createBuffer(tag) });
            decipher.update(forge.util.createBuffer(ciphertext));
            const ok = decipher.finish();

            if (!ok) return '[Decryption failed — message may be corrupted]';

            return decipher.output.toString('utf8');
        } catch (err) {
            console.error('Decryption error:', err);
            return '[Could not decrypt — check your private key]';
        }
    }, [userid]);

    // AUTH + DATA FETCHING

    const authenticateUser = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API}/userauthenticate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
            });
            const data = await response.json();
            // id comes back as a string from the JWT parse it so === comparisons dont silently fail
            setUserId(Number(data.id));
            setUser(data.name);
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    }, [token]);

    const checkBlockBeforeSend = useCallback(async (targetId) => {
        if (!userid || !targetId) return false;
        try {
            const response = await fetch(`${API}/block-status/${userid}/${targetId}`);
            const data = await response.json();
            return data.blocked;
        } catch {
            return false;
        }
    }, [userid]);

    const fetchFriendsList = useCallback(async () => {
        try {
            const response = await fetch(`${API}/all-friends`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (data.friends === "no_friends") {
                setListFriends([]);
            } else {
                setListFriends(data.map(friend => ({
                    id: friend.friend_id,
                    name: friend.username
                })));
            }
        } catch (error) {
            console.error("Error fetching friends list:", error);
        }
    }, [token]);

    const fetchMessageHistory = useCallback((friendId) => {
        if (userid && friendId) {
            socket.emit('getMessageHistory', { userId: userid, friendId });
        }
    }, [userid]);

    const handleUserSelection = (user) => {
        setSelectedUser(user);
        fetchMessageHistory(user.id);
    };


    // SOCKET EVENTS

    useEffect(() => {
        socket.on("connect", () => console.log("Socket connected:", socket.id));
        return () => socket.off("connect");
    }, []);

    useEffect(() => {
        if (selectedUser && userid) {
            const sorted = [userid, selectedUser.id].sort((a, b) => a - b);
            socket.emit("joinRoom", { userId: sorted[0], friendId: sorted[1] });
            // Small delay to make sure the room join completes before requesting history
            setTimeout(() => fetchMessageHistory(selectedUser.id), 100);
        }
    }, [selectedUser, userid, fetchMessageHistory]);

    // Message history from server — decrypt everything up front so the render stays simple
    useEffect(() => {
        const handleMessageHistory = (data) => {
            if (!data?.messages?.length) return;

            const { friendId, messages } = data;

            const decryptedMessages = messages.map((msg) => ({
                ...msg,
                message_text: msg.is_deleted
                    ? null
                    : decrypt(msg.message_text, msg.sender_id)
            }));

            setMessages(prevMessages => {
                const existingIndex = prevMessages.findIndex(c => c.friendId === friendId);

                if (existingIndex !== -1) {
                    // Only append messages we havent seen yet avoids duplicates on re-focus
                    const existing = prevMessages[existingIndex].messages;
                    const newMsgs = decryptedMessages.filter(
                        m => !existing.some(e => e.message_id === m.message_id)
                    );
                    return prevMessages.map((chat, i) =>
                        i === existingIndex
                            ? { ...chat, messages: [...chat.messages, ...newMsgs] }
                            : chat
                    );
                }

                return [...prevMessages, { friendId, messages: decryptedMessages }];
            });
        };

        socket.on('messageHistory', handleMessageHistory);
        return () => socket.off('messageHistory', handleMessageHistory);
    }, [decrypt]);

    // Real time incoming message from the other person
    useEffect(() => {
        const handleReceive = async (message) => {
            // The server broadcasts to the whole room so filter out our own echoes here
            if (message.sender_id === userid) return;

            const decryptedMessage = {
                message_id: message.message_id,
                sender_id: message.sender_id,
                receiver_id: message.receiver_id,
                message_text: await Promise.resolve(
                    decrypt(message.message_text, message.sender_id)
                ),
                is_deleted: false,
            };

            setMessages((prevMessages) => {
                const chatIndex = prevMessages.findIndex(
                    chat => chat.friendId === message.sender_id || chat.friendId === message.receiver_id
                );

                if (chatIndex !== -1) {
                    return prevMessages.map((chat, i) =>
                        i === chatIndex
                            ? { ...chat, messages: [...chat.messages, decryptedMessage] }
                            : chat
                    );
                }

                const friendId = message.sender_id === userid
                    ? message.receiver_id
                    : message.sender_id;

                return [...prevMessages, { friendId, messages: [decryptedMessage] }];
            });
        };

        const handleDelete = ({ message_id, sender_id, receiver_id }) => {
            setMessages(prevMessages =>
                prevMessages.map(chat => {
                    if (chat.friendId === sender_id || chat.friendId === receiver_id) {
                        return {
                            ...chat,
                            messages: chat.messages.map(msg =>
                                msg.message_id === message_id ? { ...msg, is_deleted: true } : msg
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

    // Server confirmation that our sent message was saved
    useEffect(() => {
        const handleMessageSent = (message) => {
            const plaintext = message.tempKey
                ? pendingPlaintexts.current[message.tempKey]
                : null;

            if (message.tempKey) delete pendingPlaintexts.current[message.tempKey];

            const decryptedMessage = {
                ...message,
                message_text: plaintext ?? '[Message sent — reload to view]',
                is_deleted: false,
            };

            setMessages(prevMessages => {
                const chatIndex = prevMessages.findIndex(
                    chat => chat.friendId === message.sender_id || chat.friendId === message.receiver_id
                );

                if (chatIndex !== -1) {
                    const filtered = prevMessages[chatIndex].messages.filter(
                        msg => !(msg.message_id > Date.now() - 10000 && msg.sender_id === userid)
                    );
                    return prevMessages.map((chat, i) =>
                        i === chatIndex
                            ? { ...chat, messages: [...filtered, decryptedMessage] }
                            : chat
                    );
                }

                // First message in a new conversation — create the chat entry
                const friendId = message.receiver_id === userid ? message.sender_id : message.receiver_id;
                return [...prevMessages, { friendId, messages: [decryptedMessage] }];
            });
        };

        socket.on("messageSent", handleMessageSent);
        return () => socket.off("messageSent", handleMessageSent);
    }, [decrypt, userid]);

    // SEND + DELETE

    const handleSendMessage = async () => {
        if (!selectedUser || !messageInput.trim()) return;

        const isBlocked = await checkBlockBeforeSend(selectedUser.id);
        if (isBlocked) {
            alert('You cannot message this user');
            return;
        }
        
        const plaintextMessage = messageInput;
        setMessageInput('');

        try {
            const encryptedMessage = await encrypt(plaintextMessage, selectedUser.id);

            const sorted = [userid, selectedUser.id].sort((a, b) => a - b);
            const room = `dm-${sorted[0]}-${sorted[1]}`;

            // Store the plaintext locally so we can display it immediately when the
            // server echoes back the messageSent event without needing to redecrypt
            const tempKey = `${selectedUser.id}-${Date.now()}`;
            pendingPlaintexts.current[tempKey] = plaintextMessage;

            socket.emit("sendMessage", {
                room,
                sender_id: userid,
                receiver_id: selectedUser.id,
                message_text: encryptedMessage,
                username: user,
                tempKey,
            });
        } catch (err) {
            console.error('Failed to encrypt and send message:', err);
            alert('Could not send message. Make sure your private key is loaded in Settings.');
        }
    };

    const handleDeleteMessage = (messageId) => {
        socket.emit("deleteMessage", { messageId });
    };

    // MISC EFFECTS

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                selectedMessageId &&
                messageRefs.current[selectedMessageId] &&
                !messageRefs.current[selectedMessageId].contains(event.target)
            ) {
                setSelectedMessageId(null);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [selectedMessageId]);

    useEffect(() => {
        const fetchData = async () => {
            await authenticateUser();
            await fetchFriendsList();
        };
        fetchData();
    }, [authenticateUser, fetchFriendsList]);

    // If the user arrived from a notification link select that friend
    useEffect(() => {
        if (!usernotif || listfriends.length === 0) return;
        const selectedUserFromNotif = listfriends.find(u => u.id === usernotif);
        if (selectedUserFromNotif) setSelectedUser(selectedUserFromNotif);
    }, [usernotif, listfriends]);

    // Keep the chat scrolled to the bottom as new messages come in
    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // RENDER

    return (
        <Container fluid className='mt-5 messaging-page'>
            <Row className='h-100'>
                <Col sm={4} className='p-3 friends-list'>
                    <h4 className='mb-3'>Friends</h4>
                    <ListGroup variant='flush'>
                        {listfriends.map((u) => (
                            <ListGroup.Item
                                key={u.id}
                                action
                                active={u === selectedUser}
                                className='friend-item'
                                onClick={() => handleUserSelection(u)}
                            >
                                {u.name}
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
                                        .find(chat => chat.friendId === selectedUser.id)
                                        ?.messages.map((msg, index) => (
                                            <div
                                                key={index}
                                                ref={(el) => (messageRefs.current[msg.message_id] = el)}
                                                className={`message ${msg.sender_id === userid ? 'sent' : 'received'}`}
                                                onClick={() => setSelectedMessageId(msg.message_id)}
                                            >
                                                <p className='mb-0'>
                                                    {msg.is_deleted
                                                        ? <i>Deleted Message</i>
                                                        : msg.message_text}
                                                </p>
                                                {/* Only show the delete button on your own messages when selected */}
                                                {selectedMessageId === msg.message_id &&
                                                    msg.sender_id === userid &&
                                                    !msg.is_deleted && (
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            className="mt-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
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
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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
    );
};

export default Messaging;