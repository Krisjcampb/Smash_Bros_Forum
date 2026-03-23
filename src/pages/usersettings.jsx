import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Modal, InputGroup } from 'react-bootstrap';
import { saveAs } from 'file-saver';
import { BsEye, BsEyeSlash, BsShieldLock, BsDownload, BsUpload } from 'react-icons/bs';
import { encryptPrivateKey, decryptPrivateKey } from '../components/Utilities/passphraseUtils';
import { API } from '../components/Utilities/apiUrl';

function UserSettings({ toggleTheme }) {
    const token = localStorage.getItem('token');

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light-theme');

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const handleToggleTheme = () => {
        const newTheme = theme === 'light-theme' ? 'dark-theme' : 'light-theme';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (toggleTheme) toggleTheme();
    };

    // Check once on mount whether the key is already unlocked for this session
    const keyInSession = !!sessionStorage.getItem('privateKey');

    const [showChangePassphrase, setShowChangePassphrase] = useState(false);
    const [currentPassphrase, setCurrentPassphrase] = useState('');
    const [newPassphrase, setNewPassphrase] = useState('');
    const [confirmNewPassphrase, setConfirmNewPassphrase] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [passphraseError, setPassphraseError] = useState('');
    const [passphraseSuccess, setPassphraseSuccess] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleChangePassphrase = async () => {
        setPassphraseError('');
        setPassphraseSuccess('');

        if (newPassphrase.length < 10) {
            setPassphraseError('New passphrase must be at least 10 characters');
            return;
        }
        if (newPassphrase !== confirmNewPassphrase) {
            setPassphraseError('New passphrases do not match');
            return;
        }

        setIsSaving(true);
        try {
            // Fetch the encrypted blob stored on the server
            const fetchResponse = await fetch(`${API}/get-encrypted-key`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!fetchResponse.ok) throw new Error('Could not fetch your encrypted key');

            const { encryptedKey, salt, iv } = await fetchResponse.json();

            // Decrypt with the current passphrase to get the raw PEM
            const privateKeyPem = await decryptPrivateKey(encryptedKey, salt, iv, currentPassphrase);

            // Re-encrypt under the new passphrase and push it to the server
            const newEncrypted = await encryptPrivateKey(privateKeyPem, newPassphrase);

            const saveResponse = await fetch(`${API}/update-encrypted-key`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newEncrypted),
            });

            if (!saveResponse.ok) throw new Error('Failed to save new encrypted key');

            // Keep sessionStorage in sync so messages stay readable without re-login
            sessionStorage.setItem('privateKey', privateKeyPem);

            setPassphraseSuccess('Passphrase updated successfully!');
            setCurrentPassphrase('');
            setNewPassphrase('');
            setConfirmNewPassphrase('');
        } catch (err) {
            if (err.message === 'Incorrect passphrase') {
                setPassphraseError('Current passphrase is incorrect');
            } else {
                console.error(err);
                setPassphraseError('Something went wrong. Please try again.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadKey = () => {
        const privateKeyPem = sessionStorage.getItem('privateKey');
        if (!privateKeyPem) {
            alert('Your private key is not loaded. Please log out and log back in then unlock with your passphrase first.');
            return;
        }
        const blob = new Blob([privateKeyPem], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'smashpoint_private_key.txt');
    };

    const [uploadSuccess, setUploadSuccess] = useState('');
    const [uploadError, setUploadError] = useState('');

    const handleUploadKey = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadError('');
        setUploadSuccess('');

        const reader = new FileReader();
        reader.onload = (event) => {
            const key = event.target.result.trim();
            // Basic sanity check before storing
            if (!key.startsWith('-----BEGIN RSA PRIVATE KEY-----') && !key.startsWith('-----BEGIN PRIVATE KEY-----')) {
                setUploadError('This does not appear to be a valid private key file.');
                return;
            }
            sessionStorage.setItem('privateKey', key);
            setUploadSuccess('Private key loaded for this session.');
        };
        reader.readAsText(file);
        // Clear so the same file can be re-selected if needed
        e.target.value = '';
    };

    return (
        <Container className="mt-4" style={{ maxWidth: '600px' }}>
            <h2 className="mb-4">Settings</h2>

            {/* Appearance */}
            <section className="mb-5">
                <h5>Appearance</h5>
                <Button onClick={handleToggleTheme} variant="secondary">
                    {theme === 'light-theme' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                </Button>
            </section>

            {/* Messaging security */}
            <section className="mb-5">
                <h5><BsShieldLock className="me-2" />Messaging Security</h5>

                <Alert variant={keyInSession ? 'success' : 'warning'} className="mb-3">
                    {keyInSession
                        ? '🔓 Your private key is loaded for this session. Messages are decryptable.'
                        : '🔒 Private key not loaded. Log out and back in then enter your passphrase to read messages.'}
                </Alert>

                <div className="mb-3">
                    <p className="text-muted small mb-2">
                        Your passphrase protects your private key. Change it here if needed.
                    </p>
                    <Button
                        variant="outline-primary"
                        onClick={() => {
                            setPassphraseError('');
                            setPassphraseSuccess('');
                            setShowChangePassphrase(true);
                        }}
                    >
                        Change Passphrase
                    </Button>
                </div>

                <div className="mb-3">
                    <p className="text-muted small mb-2">
                        Download your raw private key as a backup. Store it somewhere safe like a
                        password manager. This is your only recovery option if you forget your passphrase.
                    </p>
                    <Button variant="outline-secondary" onClick={handleDownloadKey} disabled={!keyInSession}>
                        <BsDownload className="me-2" />
                        Download Backup Key
                    </Button>
                    {/* Only show the hint when the key is not yet loaded */}
                    {!keyInSession && (
                        <Form.Text className="text-muted d-block mt-1">
                            Unlock your key with your passphrase first to download it.
                        </Form.Text>
                    )}
                </div>

                <div className="mb-3">
                    <p className="text-muted small mb-2">
                        If you have a backup key file and forgot your passphrase upload
                        it here to restore access for this session.
                    </p>
                    <label htmlFor="keyUpload">
                        <Button
                            as="span"
                            variant="outline-secondary"
                            style={{ cursor: 'pointer' }}
                        >
                            <BsUpload className="me-2" />
                            Upload Backup Key
                        </Button>
                    </label>
                    <Form.Control
                        id="keyUpload"
                        type="file"
                        accept=".txt,.pem"
                        onChange={handleUploadKey}
                        style={{ display: 'none' }}
                    />
                    {uploadSuccess && <Alert variant="success" className="mt-2 py-2">{uploadSuccess}</Alert>}
                    {uploadError && <Alert variant="danger" className="mt-2 py-2">{uploadError}</Alert>}
                </div>
            </section>

            <Modal show={showChangePassphrase} onHide={() => setShowChangePassphrase(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Change Passphrase</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {passphraseSuccess && <Alert variant="success">{passphraseSuccess}</Alert>}

                    <Form.Group className="mb-3">
                        <Form.Label>Current Passphrase</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type={showCurrentPass ? 'text' : 'password'}
                                value={currentPassphrase}
                                onChange={(e) => setCurrentPassphrase(e.target.value)}
                                placeholder="Enter current passphrase"
                            />
                            <InputGroup.Text>
                                <Button variant="link" onClick={() => setShowCurrentPass(!showCurrentPass)} className="p-0">
                                    {showCurrentPass ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                                </Button>
                            </InputGroup.Text>
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>New Passphrase</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type={showNewPass ? 'text' : 'password'}
                                value={newPassphrase}
                                onChange={(e) => setNewPassphrase(e.target.value)}
                                placeholder="At least 10 characters"
                            />
                            <InputGroup.Text>
                                <Button variant="link" onClick={() => setShowNewPass(!showNewPass)} className="p-0">
                                    {showNewPass ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                                </Button>
                            </InputGroup.Text>
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Confirm New Passphrase</Form.Label>
                        <Form.Control
                            type={showNewPass ? 'text' : 'password'}
                            value={confirmNewPassphrase}
                            onChange={(e) => setConfirmNewPassphrase(e.target.value)}
                            placeholder="Repeat new passphrase"
                        />
                    </Form.Group>

                    {passphraseError && <Alert variant="danger">{passphraseError}</Alert>}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="primary"
                        onClick={handleChangePassphrase}
                        disabled={isSaving || !currentPassphrase || !newPassphrase || !confirmNewPassphrase}
                    >
                        {isSaving ? 'Saving...' : 'Update Passphrase'}
                    </Button>
                    <Button variant="secondary" onClick={() => setShowChangePassphrase(false)}>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default UserSettings;