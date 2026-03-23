// src/components/Utilities/PassphraseUnlock.jsx

import React, { useState } from 'react';
import { Modal, Button, Form, Alert, InputGroup } from 'react-bootstrap';
import { BsEye, BsEyeSlash, BsShieldLock } from 'react-icons/bs';
import { decryptPrivateKey } from './passphraseUtils';
import { API } from '../Utilities/apiUrl';

const PassphraseUnlock = ({ show, email, onUnlocked, onSkip }) => {
    const [passphrase, setPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleUnlock = async () => {
        if (!passphrase.trim()) {
            setError('Please enter your passphrase.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Fetch the encrypted key blob from the server
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/get-encrypted-key`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                setError('Could not retrieve your key. Please try again.');
                return;
            }

            const { encrypted_key: encryptedKey, salt, iv } = await response.json();

            // Decrypt client-side — passphrase never leaves the browser
            const privateKeyPem = await decryptPrivateKey(encryptedKey, salt, iv, passphrase);

            // Store in sessionStorage — clears automatically when the tab closes
            sessionStorage.setItem('privateKey', privateKeyPem);

            setPassphrase('');
            onUnlocked();
        } catch (err) {
            if (err.message === 'Incorrect passphrase') {
                setError('Incorrect passphrase. Please try again.');
            } else {
                console.error('Unlock error:', err);
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        setPassphrase('');
        setError('');
        onSkip();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleUnlock();
    };

    return (
        <Modal show={show} onHide={handleSkip} backdrop="static">
            <Modal.Header>
                <Modal.Title>
                    <BsShieldLock className="me-2" />
                    Unlock Your Messages
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="text-muted">
                    Enter your messaging passphrase to decrypt your private key and access
                    your direct messages. Your passphrase never leaves your device.
                </p>

                <Form.Group className="mb-3">
                    <Form.Label>Passphrase</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type={showPassphrase ? 'text' : 'password'}
                            placeholder="Enter your passphrase"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <InputGroup.Text>
                            <Button
                                variant="link"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                                className="p-0"
                            >
                                {showPassphrase ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                            </Button>
                        </InputGroup.Text>
                    </InputGroup>
                </Form.Group>

                {error && <Alert variant="danger">{error}</Alert>}

                <p className="text-muted small mb-0">
                    Skipping means you can browse the forum but won't be able to read or
                    send direct messages until you unlock.
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant="primary"
                    onClick={handleUnlock}
                    disabled={isLoading || !passphrase}
                >
                    {isLoading ? 'Unlocking...' : 'Unlock'}
                </Button>
                <Button variant="secondary" onClick={handleSkip}>
                    Skip for now
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PassphraseUnlock;