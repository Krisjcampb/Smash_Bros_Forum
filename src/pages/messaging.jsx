import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Container, Row, Col, ListGroup, Card, Form, Button } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router-dom';
import socket from "../websocket/socket";
import forge from 'node-forge';
import { API } from '../components/Utilities/apiUrl';
import { authFetch } from '../components/Utilities/authHelpers';
import PassphraseUnlock from '../components/Utilities/passphraseUnlock';

const PAGE_SIZE = 50;

const Messaging = () => {
    const messageContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
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
    const [showPassphraseModal, setShowPassphraseModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const token = localStorage.getItem('token')

    //tracking state of loaded images
    const [loadedImageIds, setLoadedImageIds] = useState(() => new Set());
    const scrollTimeoutRef = useRef(null);

    // Pagination state, per friendId
    const [hasMoreByFriend, setHasMoreByFriend] = useState({});
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const isLoadingOlderRef = useRef(false);

    // Tracks whether we should auto-scroll to bottom (fresh load / new message)
    // vs preserve scroll position (loading older history)
    const pendingScrollMode = useRef('bottom'); // 'bottom' | 'preserve' | 'none'
    const preserveScrollInfo = useRef({ scrollHeight: 0, scrollTop: 0 });

    useEffect(() => {
        const keyInSession = !!sessionStorage.getItem('privateKey');
        if (token && !keyInSession) {
            setShowPassphraseModal(true);
        }
    }, [token]);

    useEffect(() => {
        document.body.classList.add('messaging-active');
        return () => {
            document.body.classList.remove('messaging-active');
        };
    }, []);

    const handleSkipPassphrase = () => {
        setShowPassphraseModal(false);
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    const expectedImageIds = useMemo(() => {
        const chat = messages.find(c => c.friendId === selectedUser?.id);
        if (!chat) return [];
        return chat.messages.filter(m => m.filepath).map(m => m.message_id);
    }, [messages, selectedUser]);

    const allImagesReady = useMemo(() => {
        if (expectedImageIds.length === 0) return true;
        return expectedImageIds.every(id => loadedImageIds.has(id));
    }, [expectedImageIds, loadedImageIds]);

    const getProfileImageUrl = useCallback((characterName, selectedSkin) => {
        if (!characterName || selectedSkin === null) return `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/Mario/chara_3_mario_00.png`;
        return `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${characterName}/chara_0_${characterName.toLowerCase()}_0${selectedSkin}.png`;
    }, []);

    const filteredFriends = useMemo(() => {
        return listfriends.filter(friend =>
            friend.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [listfriends, searchQuery]);

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
        const response = await authFetch(API, `${API}/get-public-key/${recipientId}`);
        if (!response.ok) throw new Error('Failed to fetch recipient public key');
        const { publicKey } = await response.json();
        return forge.pki.publicKeyFromPem(publicKey);
    }, []);

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
            const chunkSize = 0x8000;

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

            const encryptedUint8 = new Uint8Array([...encryptedData].map(c => c.charCodeAt(0)));
            const tagUint8 = new Uint8Array([...tag].map(c => c.charCodeAt(0)));
            const combined = new Uint8Array(encryptedUint8.length + tagUint8.length);
            combined.set(encryptedUint8);
            combined.set(tagUint8, encryptedUint8.length);

            let combinedBinary = '';
            for (let i = 0; i < combined.length; i += chunkSize) {
                combinedBinary += String.fromCharCode.apply(null, combined.subarray(i, i + chunkSize));
            }

            return {
                encryptedData: forge.util.encode64(combinedBinary),
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

    const uploadEncryptedImage = async (encryptedImageData, message_id) => {
        try {
            if (!message_id) throw new Error("message_id is required");

            const encryptedBytes = forge.util.decode64(encryptedImageData.encryptedData);
            const uint8 = new Uint8Array(encryptedBytes.length);
            for (let i = 0; i < encryptedBytes.length; i++) {
                uint8[i] = encryptedBytes.charCodeAt(i);
            }
            const blob = new Blob([uint8], { type: 'application/octet-stream' });

            const formData = new FormData();
            formData.append('image', blob, 'encrypted.bin');
            formData.append('message_id', message_id);
            formData.append('sender_id', userid);
            formData.append('receiver_id', selectedUser.id);
            formData.append('encrypted_key_sender', encryptedImageData.encryptedKeySender);
            formData.append('encrypted_key_recipient', encryptedImageData.encryptedKeyRecipient);
            formData.append('iv', encryptedImageData.iv);
            formData.append('mime_type', encryptedImageData.mimeType);
            formData.append('filename', encryptedImageData.filename);

            const response = await authFetch(API, `${API}/uploadEncryptedImage`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("Upload failed:", errText);
                throw new Error('Upload failed');
            }

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

            const encryptedAESKey = senderId === userid
                ? imageData.encrypted_key_sender
                : imageData.encrypted_key_recipient;

            const aesKey = privateKey.decrypt(
                forge.util.decode64(encryptedAESKey),
                'RSA-OAEP'
            );

            const response = await fetch(imageData.filepath);
            const arrayBuffer = await response.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);

            const ciphertext = uint8.slice(0, -16);
            const tag = uint8.slice(-16);

            const iv = forge.util.decode64(imageData.iv);

            const decipher = forge.cipher.createDecipher('AES-GCM', aesKey);
            decipher.start({
                iv,
                tag: forge.util.createBuffer(String.fromCharCode(...tag))
            });

            const chunkSize = 0x8000;
            for (let i = 0; i < ciphertext.length; i += chunkSize) {
                const chunk = ciphertext.subarray(i, i + chunkSize);
                decipher.update(forge.util.createBuffer(String.fromCharCode(...chunk)));
            }

            if (!decipher.finish()) {
                throw new Error('Decryption failed');
            }

            const decryptedBytes = decipher.output.getBytes();

            const decryptedUint8 = new Uint8Array(decryptedBytes.length);
            for (let i = 0; i < decryptedBytes.length; i++) {
                decryptedUint8[i] = decryptedBytes.charCodeAt(i);
            }

            const blob = new Blob([decryptedUint8], { type: imageData.mime_type });

            return URL.createObjectURL(blob);

        } catch (err) {
            console.error('Image decryption failed:', err);
            return null;
        }
    }, [userid]);

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
    const processedIds = useRef(new Set());

    useEffect(() => {
        if (!selectedUser) return;

        const decryptAllImages = async () => {
            const chat = messages.find(c => c.friendId === selectedUser?.id);
            if (!chat) return;

            await Promise.all(chat.messages.map(async (msg) => {
                if (msg.filepath && !processedIds.current.has(msg.message_id)) {

                    processedIds.current.add(msg.message_id);

                    try {
                        const decryptedUrl = await decryptImage({
                            filepath: msg.filepath,
                            encrypted_key_sender: msg.encrypted_key_sender,
                            encrypted_key_recipient: msg.encrypted_key_recipient,
                            iv: msg.image_iv,
                            mime_type: msg.mime_type
                        }, msg.sender_id);

                        if (decryptedUrl) {
                            setDecryptedImages(prev => ({
                                ...prev,
                                [msg.message_id]: decryptedUrl
                            }));
                        }

                    } catch (err) {
                        processedIds.current.delete(msg.message_id);
                        console.error('Failed to decrypt image:', err);
                        // Won't ever render an <img>, so mark ready so it doesn't block scrolling
                        setLoadedImageIds(prev => {
                            if (prev.has(msg.message_id)) return prev;
                            const next = new Set(prev);
                            next.add(msg.message_id);
                            return next;
                        });
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
            const response = await authFetch(API, `${API}/userauthenticate`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
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
            const response = await authFetch(API, `${API}/all-friends`);
            const data = await response.json();

            if (data.friends === "no_friends") {
                setListFriends([]);
            } else {
                setListFriends(data.map(friend => ({
                    id: friend.friend_id,
                    name: friend.username,
                    character_name: friend.character_name,
                    selected_skin: friend.selected_skin
                })));
            }
        } catch (error) {
            console.error("Error fetching friends list:", error);
        }
    }, []);

    // Fetch the most recent page of history (used on opening a chat)
    const fetchMessageHistory = useCallback((friendId) => {
        if (userid && friendId) {
            pendingScrollMode.current = 'bottom';
            socket.emit('getMessageHistory', { userId: userid, friendId, before: null, limit: PAGE_SIZE });
        }
    }, [userid]);

    // Fetch an older page (used when scrolling up)
    const fetchOlderMessages = useCallback(() => {
        if (!selectedUser || !userid) return;
        if (isLoadingOlderRef.current) return;
        if (hasMoreByFriend[selectedUser.id] === false) return;

        const chat = messages.find(c => c.friendId === selectedUser.id);
        const oldest = chat?.messages?.[0];
        if (!oldest) return;

        const container = messageContainerRef.current;
        if (container) {
            preserveScrollInfo.current = {
                scrollHeight: container.scrollHeight,
                scrollTop: container.scrollTop
            };
        }

        isLoadingOlderRef.current = true;
        setIsLoadingOlder(true);
        pendingScrollMode.current = 'preserve';

        socket.emit('getMessageHistory', {
            userId: userid,
            friendId: selectedUser.id,
            before: oldest.message_id,
            limit: PAGE_SIZE
        });
    }, [selectedUser, userid, messages, hasMoreByFriend]);

    const handleUserSelection = (u) => {
        setSelectedUser(u);
    };

    // Scroll-up detection to trigger loading older messages
    const handleScroll = useCallback(() => {
        const container = messageContainerRef.current;
        if (!container) return;
        if (container.scrollTop < 80) {
            fetchOlderMessages();
        }
    }, [fetchOlderMessages]);

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
        if (!userid) return;

        setMessages(prev => prev.map(chat => ({
            ...chat,
            messages: chat.messages.map(msg => ({
                ...msg,
                decrypted_text: msg.is_deleted
                    ? null
                    : decrypt(msg.encrypted_text || msg.message_text, msg.sender_id)
            }))
        })));
    }, [userid, decrypt]);

    useEffect(() => {
        const handleMessageHistory = (data) => {
            if (!data) return;
            const { friendId, messages: incoming = [], hasMore } = data;

            const decryptedMessages = incoming.map((msg) => ({
                ...msg,
                encrypted_text: msg.message_text,
                decrypted_text: msg.is_deleted
                    ? null
                    : decrypt(msg.message_text, msg.sender_id)
            }));

            // hasMore may be undefined if backend doesn't support pagination yet;
            // treat undefined as "no more" so we don't loop forever requesting the same page.
            setHasMoreByFriend(prev => ({
                ...prev,
                [friendId]: hasMore === undefined ? false : hasMore
            }));

            setMessages(prevMessages => {
                const existingIndex = prevMessages.findIndex(c => c.friendId === friendId);

                if (existingIndex !== -1) {
                    const existing = prevMessages[existingIndex].messages;
                    const existingIds = new Set(existing.map(e => e.message_id));
                    const newOnes = decryptedMessages.filter(m => !existingIds.has(m.message_id));

                    if (newOnes.length === 0) return prevMessages;

                    // Older-page fetches return messages that come BEFORE what we have,
                    // so prepend; everything else (fresh load / live receive) appends.
                    const isOlderPage = pendingScrollMode.current === 'preserve';
                    const merged = isOlderPage
                        ? [...newOnes, ...existing]
                        : [...existing, ...newOnes];

                    return prevMessages.map((chat, i) =>
                        i === existingIndex
                            ? { ...chat, messages: merged }
                            : chat
                    );
                }

                return [...prevMessages, { friendId, messages: decryptedMessages }];
            });

            isLoadingOlderRef.current = false;
            setIsLoadingOlder(false);
        };

        socket.on('messageHistory', handleMessageHistory);
        return () => socket.off('messageHistory', handleMessageHistory);
    }, [decrypt]);

    useEffect(() => {
        const handleReceive = async (message) => {
            if (message.sender_id === userid) return;

            const decryptedMessage = {
                message_id: message.message_id || Date.now(),
                sender_id: message.sender_id,
                receiver_id: message.receiver_id,

                encrypted_text: message.message_text,
                decrypted_text: decrypt(message.message_text, message.sender_id),

                filepath: message.filepath || null,
                encrypted_key_sender: message.encrypted_key_sender || null,
                encrypted_key_recipient: message.encrypted_key_recipient || null,
                image_iv: message.image_iv || null,
                mime_type: message.mime_type || null,

                is_deleted: false,
            };

            pendingScrollMode.current = 'bottom';

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
                encrypted_text: message.message_text,
                decrypted_text: plaintext ?? '[Message sent — reload to view]',
                is_deleted: false,
            };

            pendingScrollMode.current = 'bottom';

            setMessages(prevMessages => {
                const chatIndex = prevMessages.findIndex(
                    chat => chat.friendId === message.sender_id || chat.friendId === message.receiver_id
                );

                if (chatIndex !== -1) {
                    const already = prevMessages[chatIndex].messages.some(
                        msg => msg.message_id === message.message_id
                    );
                    if (already) return prevMessages;

                    return prevMessages.map((chat, i) =>
                        i === chatIndex
                            ? { ...chat, messages: [...chat.messages, decryptedMessage] }
                            : chat
                    );
                }

                const friendId = message.receiver_id === userid
                    ? message.sender_id
                    : message.receiver_id;

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
            const plaintextMessage = messageInput || (selectedImage ? '[Image]' : '');

            const encryptedMessage = await encrypt(plaintextMessage, selectedUser.id);

            const tempKey = `${selectedUser.id}-${Date.now()}`;
            pendingPlaintexts.current[tempKey] = plaintextMessage;

            const res = await authFetch(API, `${API}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender_id: userid,
                    receiver_id: selectedUser.id,
                    message_text: encryptedMessage,
                    username: user
                })
            });

            if (!res.ok) {
                throw new Error('Failed to create message');
            }

            const savedMessage = await res.json();
            const message_id = savedMessage.message_id;

            let uploadedImage = null;

            if (selectedImage) {
                const encrypted = await encryptImage(selectedImage, selectedUser.id);

                if (!encrypted?.encryptedKeySender || !encrypted?.encryptedKeyRecipient || !encrypted?.iv) {
                    throw new Error("Encryption failed - missing fields");
                }

                uploadedImage = await uploadEncryptedImage(encrypted, message_id);
            }

            socket.emit("sendMessage", {
                ...savedMessage,

                filepath: uploadedImage?.filepath || null,
                encrypted_key_sender: uploadedImage?.encrypted_key_sender || null,
                encrypted_key_recipient: uploadedImage?.encrypted_key_recipient || null,
                image_iv: uploadedImage?.iv || null,
                mime_type: uploadedImage?.mime_type || null,

                tempKey
            });

            if (uploadedImage) {
                const decryptedUrl = await decryptImage(uploadedImage, userid);

                setDecryptedImages(prev => ({
                    ...prev,
                    [message_id]: decryptedUrl
                }));
            }

            setMessageInput('');
            setSelectedImage(null);

        } catch (err) {
            console.error('Failed to send message:', err);
            alert('Failed to send message');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleDeleteMessage = (messageId) => {
        socket.emit("deleteMessage", { messageId });
    };

    // MISC EFFECTS

    useEffect(() => {
        processedIds.current.clear();
        setDecryptedImages({});
        setLoadedImageIds(new Set());
    }, [selectedUser]);

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

    // Scroll handling: bottom on fresh load / new messages, preserve position on older-page load
    useEffect(() => {
        const container = messageContainerRef.current;
        if (!container) return;

        if (pendingScrollMode.current === 'bottom') {
            if (!allImagesReady) {
                // Not ready yet — set a safety timeout in case an image never fires load/error
                clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ block: 'end' });
                }, 2000); // fallback: scroll anyway after 2s even if something is stuck
                return () => clearTimeout(scrollTimeoutRef.current);
            }

            clearTimeout(scrollTimeoutRef.current);
            const raf = requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ block: 'end' });
            });
            return () => cancelAnimationFrame(raf);
        }

        if (pendingScrollMode.current === 'preserve') {
            const raf = requestAnimationFrame(() => {
                const { scrollHeight: oldHeight, scrollTop: oldTop } = preserveScrollInfo.current;
                const newHeight = container.scrollHeight;
                container.scrollTop = oldTop + (newHeight - oldHeight);
                pendingScrollMode.current = 'none';
            });
            return () => cancelAnimationFrame(raf);
        }
    }, [messages, selectedUser, decryptedImages, allImagesReady]);

    // RENDER

    return (
        <Container fluid className={`mt-5 messaging-page ${selectedUser ? 'has-selected-user' : ''}`}>
            <Row className='h-100'>
                <Col sm={4} className='p-3 friends-list'>
                    <div className="friends-list-header">
                        <h4>Friends</h4>
                        <div className="friend-search-wrap">
                            <Form.Control
                                type='text'
                                placeholder='Search friends...'
                                className='friend-search-input'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <ListGroup variant='flush' className='friend-list-items-container'>
                        {filteredFriends.length === 0 ? (
                            <div className="friend-list-empty">
                                {searchQuery ? 'No friends match your search' : 'No friends yet'}
                            </div>
                        ) : (
                            filteredFriends.map((u) => (
                                <ListGroup.Item
                                    key={u.id}
                                    action
                                    active={selectedUser?.id === u.id}
                                    className='friend-item d-flex align-items-center'
                                    onClick={() => handleUserSelection(u)}
                                >
                                    <img
                                        src={getProfileImageUrl(u.character_name, u.selected_skin)}
                                        alt={u.name}
                                        className="friend-avatar me-3"
                                    />
                                    <span className="friend-name"> {u.name}</span>
                                </ListGroup.Item>
                            ))
                        )}
                    </ListGroup>
                </Col>
                <Col sm={8} className='chat-area'>
                    {selectedUser ? (
                        <Card className='h-100 chat-card'>
                            <Card.Header className='d-flex align-items-center chat-header'>
                                <button
                                    type="button"
                                    className="chat-back-button"
                                    onClick={() => setSelectedUser(null)}
                                    aria-label="Back to friends list"
                                >
                                    ←
                                </button>
                                <Link
                                    to={`/userprofile/${selectedUser.name}/${selectedUser.id}`}
                                    className='text-decoration-none friend-name'
                                >
                                    {selectedUser.name}
                                </Link>
                            </Card.Header>
                            <Card.Body className='chat-body'>
                                <div
                                    ref={messageContainerRef}
                                    className='messages-container'
                                    onScroll={handleScroll}
                                >
                                    {isLoadingOlder && (
                                        <div className='text-center py-2'>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Loading older messages...
                                        </div>
                                    )}
                                    {hasMoreByFriend[selectedUser.id] === false && (
                                        <div className='text-center text-muted py-2' style={{ fontSize: '0.8rem' }}>
                                            You've reached the start of this conversation
                                        </div>
                                    )}
                                    {messages
                                        .find(chat => chat.friendId === selectedUser.id)
                                        ?.messages.map((msg, index) => (
                                            <div
                                                key={index}
                                                ref={(el) => (messageRefs.current[msg.message_id] = el)}
                                                className={`message ${msg.sender_id === userid ? 'sent' : 'received'}`}
                                                onClick={() => setSelectedMessageId(msg.message_id)}
                                            >
                                                {msg.is_deleted
                                                ? <i>Deleted Message</i>
                                                : !msg.filepath && msg.decrypted_text}

                                                {msg.filepath && decryptedImages[msg.message_id] && (
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
                                                        onLoad={() => {
                                                            setLoadedImageIds(prev => {
                                                                if (prev.has(msg.message_id)) return prev;
                                                                const next = new Set(prev);
                                                                next.add(msg.message_id);
                                                                return next;
                                                            });
                                                        }}
                                                        onError={() => {
                                                            // Treat a broken image as "ready" too, so it doesn't block the scroll forever
                                                            setLoadedImageIds(prev => {
                                                                if (prev.has(msg.message_id)) return prev;
                                                                const next = new Set(prev);
                                                                next.add(msg.message_id);
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                )}

                                                {msg.filepath && !decryptedImages[msg.message_id] && (
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
                                    <div ref={messagesEndRef} />
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
                                        className='ms-8 me-8'
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
            <PassphraseUnlock
                show={showPassphraseModal}
                onUnlocked={() => setShowPassphraseModal(false)}
                onSkip={handleSkipPassphrase}
            />
        </Container>
    );
};

export default Messaging;