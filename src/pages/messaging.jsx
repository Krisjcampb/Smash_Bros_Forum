import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Container, Row, Col, ListGroup, Card, Form, Button } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import socket from "../websocket/socket";
import forge from 'node-forge';
import { API } from '../components/Utilities/apiUrl';

const Messaging = () => {
    const messageContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageRefs = useRef({});
    
    const [selectedUser, setSelectedUser] = useState(null)
    const [messageInput, setMessageInput] = useState('')
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [messages, setMessages] = useState([])
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState(null)
    const [listfriends, setListFriends] = useState([])
    const [decryptedImages, setDecryptedImages] = useState({});
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    
    const token = localStorage.getItem('token')
    const location = useLocation();
    const usernotif = useMemo(() => location.state?.entityID || null, [location.state]);

    // Stores plaintext by tempKey
    const pendingPlaintexts = useRef({});

    // Derive the senders public key locally
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

    // IMAGE ENCRYPTION FUNCTIONS

    const encryptImage = async (imageFile, recipientId) => {
        try {
            const arrayBuffer = await imageFile.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);

            let binary = '';
            const chunkSize = 0x8000; // 32KB chunks

            for (let i = 0; i < uint8.length; i += chunkSize) {
                const chunk = uint8.subarray(i, i + chunkSize);
                binary += String.fromCharCode.apply(null, chunk);
            }


            const aesKey = forge.random.getBytesSync(32);
            const iv = forge.random.getBytesSync(12);
            
            const cipher = forge.cipher.createCipher('AES-GCM', aesKey);
            cipher.start({ iv });
            cipher.update(forge.util.createBuffer(binary));
            cipher.finish();
            
            const encryptedData = cipher.output.getBytes();
            const tag = cipher.mode.tag.getBytes();
            
            const recipientPublicKey = await fetchRecipientPublicKey(recipientId);
            const senderPublicKey = getSenderPublicKey();
            
            const encryptedForSender = senderPublicKey.encrypt(aesKey, 'RSA-OAEP');
            const encryptedForRecipient = recipientPublicKey.encrypt(aesKey, 'RSA-OAEP');
            
            return {
                encryptedData: forge.util.encode64(encryptedData + tag),
                encryptedKeySender: forge.util.encode64(encryptedForSender),
                encryptedKeyRecipient: forge.util.encode64(encryptedForRecipient),
                iv: forge.util.encode64(iv),
                mimeType: imageFile.type,
                filename: imageFile.name
            };
        } catch (err) {
            console.error('Image encryption failed:', err);
            throw new Error('Failed to encrypt image');
        }
    };

    const uploadEncryptedImage = async (encryptedImageData) => {
        try {
            const encryptedBytes = forge.util.decode64(encryptedImageData.encryptedData);
            const blob = new Blob([encryptedBytes], { type: 'application/octet-stream' });
            
            const formData = new FormData();
            formData.append('image', blob, 'encrypted.bin');
            formData.append('sender_id', userid);
            formData.append('receiver_id', selectedUser.id);
            formData.append('encrypted_key_sender', encryptedImageData.encryptedKeySender);
            formData.append('encrypted_key_recipient', encryptedImageData.encryptedKeyRecipient);
            formData.append('iv', encryptedImageData.iv);
            formData.append('mime_type', encryptedImageData.mimeType);
            formData.append('filename', encryptedImageData.filename);
            
            const response = await fetch(`${API}/uploadEncryptedImage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) throw new Error('Upload failed');
            
            return await response.json();
        } catch (err) {
            console.error('Upload error:', err);
            throw err;
        }
    };

    const decryptImage = useCallback(async (imageData, senderId) => {
        try {
            const privateKeyPem = sessionStorage.getItem('privateKey');
            if (!privateKeyPem) throw new Error('Private key not found');

            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

            // Select correct encrypted AES key
            const encryptedAESKey = senderId === userid
                ? imageData.encrypted_key_sender
                : imageData.encrypted_key_recipient;

            const aesKey = privateKey.decrypt(
                forge.util.decode64(encryptedAESKey),
                'RSA-OAEP'
            );

            // Fetch encrypted image
            const response = await fetch(imageData.filepath);
            if (!response.ok) {
                throw new Error('Failed to fetch encrypted image');
            }

            const encryptedBlob = await response.blob();
            const arrayBuffer = await encryptedBlob.arrayBuffer();

            const encryptedUint8 = new Uint8Array(arrayBuffer);

            let binary = '';
            const chunkSize = 0x8000;

            for (let i = 0; i < encryptedUint8.length; i += chunkSize) {
                const chunk = encryptedUint8.subarray(i, i + chunkSize);
                binary += String.fromCharCode.apply(null, chunk);
            }

            const encryptedBytes = forge.util.createBuffer(binary);
            const iv = forge.util.decode64(imageData.iv);

            // Split ciphertext + tag
            const bytes = encryptedBytes.getBytes();
            const ciphertext = bytes.slice(0, -16);
            const tag = bytes.slice(-16);

            // Decrypt
            const decipher = forge.cipher.createDecipher('AES-GCM', aesKey);
            decipher.start({ iv, tag: forge.util.createBuffer(tag) });
            decipher.update(forge.util.createBuffer(ciphertext));

            if (!decipher.finish()) {
                throw new Error('Decryption failed');
            }

            // Convert decrypted binary string → Uint8Array
            const decryptedBytes = decipher.output.getBytes();

            const decryptedUint8 = new Uint8Array(decryptedBytes.length);
            for (let i = 0; i < decryptedBytes.length; i++) {
                decryptedUint8[i] = decryptedBytes.charCodeAt(i);
            }

            // Create image blob
            const blob = new Blob([decryptedUint8], { type: imageData.mime_type });

            return URL.createObjectURL(blob);

        } catch (err) {
            console.error('Image decryption failed:', err);
            return null;
        }
    });

    // IMAGE HANDLERS

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be under 5 MB');
            return;
        }
        
        setSelectedImage(file);
        e.target.value = '';
    };

    // Decrypt images when messages load
    useEffect(() => {
        const decryptAllImages = async () => {
            const chat = messages.find(c => c.friendId === selectedUser?.id);
            if (!chat) return;

            await Promise.all(chat.messages.map(async (msg) => {
                if (msg.image_data && !decryptedImages[msg.message_id]) {
                    try {
                        const decryptedUrl = await decryptImage(msg.image_data, msg.sender_id);
                        if (decryptedUrl) {
                            setDecryptedImages(prev => ({
                                ...prev,
                                [msg.message_id]: decryptedUrl
                            }));
                        }
                    } catch (err) {
                        console.error('Failed to decrypt image:', err);
                    }
                }
            }));
        };

        decryptAllImages();
    }, [messages, selectedUser, decryptImage]);

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
            setTimeout(() => fetchMessageHistory(selectedUser.id), 100);
        }
    }, [selectedUser, userid, fetchMessageHistory]);

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

    useEffect(() => {
        const handleReceive = async (message) => {
            if (message.sender_id === userid) return;

            const decryptedMessage = {
                message_id: message.message_id,
                sender_id: message.sender_id,
                receiver_id: message.receiver_id,
                message_text: await Promise.resolve(
                    decrypt(message.message_text, message.sender_id)
                ),
                image_data: message.image_data || null,
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

    useEffect(() => {
        const handleMessageSent = (message) => {
            const plaintext = message.tempKey
                ? pendingPlaintexts.current[message.tempKey]
                : null;

            if (message.tempKey) delete pendingPlaintexts.current[message.tempKey];

            const decryptedMessage = {
                ...message,
                message_text: plaintext ?? '[Message sent — reload to view]',
                image_data: message.image_data || null,
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

                const friendId = message.receiver_id === userid ? message.sender_id : message.receiver_id;
                return [...prevMessages, { friendId, messages: [decryptedMessage] }];
            });
        };

        socket.on("messageSent", handleMessageSent);
        return () => socket.off("messageSent", handleMessageSent);
    }, [decrypt, userid]);

    // SEND + DELETE

    const handleSendMessage = async () => {
        if (!selectedUser) return;
        if (!messageInput.trim() && !selectedImage) return;

        const isBlocked = await checkBlockBeforeSend(selectedUser.id);
        if (isBlocked) {
            alert('You cannot message this user');
            return;
        }
        
        setIsUploadingImage(true);
        
        try {
            let imageData = null;
            
            // If there's an image, encrypt and upload it first
            if (selectedImage) {
                const encrypted = await encryptImage(selectedImage, selectedUser.id);
                imageData = await uploadEncryptedImage(encrypted);
            }
            
            const plaintextMessage = messageInput || (selectedImage ? '[Image]' : '');
            const encryptedMessage = messageInput 
                ? await encrypt(plaintextMessage, selectedUser.id)
                : await encrypt('[Image]', selectedUser.id);
            
            setMessageInput('');
            setSelectedImage(null);
            
            const sorted = [userid, selectedUser.id].sort((a, b) => a - b);
            const room = `dm-${sorted[0]}-${sorted[1]}`;
            const tempKey = `${selectedUser.id}-${Date.now()}`;
            
            pendingPlaintexts.current[tempKey] = plaintextMessage;
            
            socket.emit("sendMessage", {
                room,
                sender_id: userid,
                receiver_id: selectedUser.id,
                message_text: encryptedMessage,
                image_data: imageData || null,
                username: user,
                tempKey,
            });
        } catch (err) {
            console.error('Failed to send message:', err);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsUploadingImage(false);
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

    useEffect(() => {
        if (!usernotif || listfriends.length === 0) return;
        const selectedUserFromNotif = listfriends.find(u => u.id === usernotif);
        if (selectedUserFromNotif) setSelectedUser(selectedUserFromNotif);
    }, [usernotif, listfriends]);

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
                                                {msg.message_text && (
                                                    <p className='mb-0'>
                                                        {msg.is_deleted
                                                            ? <i>Deleted Message</i>
                                                            : msg.message_text}
                                                    </p>
                                                )}
                                                
                                                {msg.image_data && decryptedImages[msg.message_id] && (
                                                    <img 
                                                        src={decryptedImages[msg.message_id]} 
                                                        alt="Encrypted attachment"
                                                        style={{ 
                                                            maxWidth: '100%',
                                                            maxHeight: '300px',
                                                            borderRadius: '8px',
                                                            marginTop: msg.message_text ? '0.5rem' : '0',
                                                            cursor: 'pointer',
                                                            display: 'block'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(decryptedImages[msg.message_id], '_blank');
                                                        }}
                                                    />
                                                )}
                                                
                                                {msg.image_data && !decryptedImages[msg.message_id] && (
                                                    <div style={{
                                                        padding: '1rem',
                                                        background: 'rgba(0,0,0,0.1)',
                                                        borderRadius: '8px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <span className="spinner-border spinner-border-sm me-2" />
                                                        Decrypting image...
                                                    </div>
                                                )}
                                                
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
                                {selectedImage && (
                                    <div style={{
                                        marginBottom: '0.5rem',
                                        padding: '0.5rem',
                                        background: 'rgba(0,0,0,0.05)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <img 
                                                src={URL.createObjectURL(selectedImage)} 
                                                alt="Preview"
                                                style={{ 
                                                    height: '40px', 
                                                    width: '40px', 
                                                    objectFit: 'cover',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                            <span style={{ fontSize: '0.85rem' }}>
                                                {selectedImage.name} ({(selectedImage.size / 1024).toFixed(1)} KB)
                                            </span>
                                        </div>
                                        <Button 
                                            variant="link" 
                                            size="sm"
                                            onClick={() => setSelectedImage(null)}
                                            style={{ color: '#d00000' }}
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                )}
                                
                                <Form className='d-flex' onSubmit={(e) => {
                                    e.preventDefault(); 
                                    handleSendMessage();
                                }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        style={{ display: 'none' }}
                                        ref={fileInputRef}
                                    />
                                    
                                    <Button 
                                        variant="outline-secondary" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="me-2"
                                        disabled={isUploadingImage}
                                        title="Attach image"
                                    >
                                        📎
                                    </Button>
                                    
                                    <Form.Control
                                        type='text'
                                        placeholder='Type your message...'
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        className='me-2'
                                        disabled={isUploadingImage}
                                    />
                                    
                                    <Button 
                                        variant='primary' 
                                        onClick={handleSendMessage}
                                        disabled={isUploadingImage || (!messageInput.trim() && !selectedImage)}
                                    >
                                        {isUploadingImage ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Sending...
                                            </>
                                        ) : 'Send'}
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