import React, { useState, useEffect } from 'react';
import { Container, Form, Alert, Modal, InputGroup } from 'react-bootstrap';
import { saveAs } from 'file-saver';
import { BsEye, BsEyeSlash, BsShieldLock, BsDownload, BsUpload, BsMoon, BsSun } from 'react-icons/bs';
import { encryptPrivateKey, decryptPrivateKey } from '../components/Utilities/passphraseUtils';
import { API } from '../components/Utilities/apiUrl';

function UserSettings({ toggleTheme }) {
    const [showChangePassphrase, setShowChangePassphrase] = useState(false);
    const [currentPassphrase, setCurrentPassphrase] = useState('');
    const [newPassphrase, setNewPassphrase] = useState('');
    const [confirmNewPassphrase, setConfirmNewPassphrase] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [passphraseError, setPassphraseError] = useState('');
    const [passphraseSuccess, setPassphraseSuccess] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [uploadError, setUploadError] = useState('');
    const token = localStorage.getItem('token');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light-theme');
    const isDark = theme === 'dark-theme';
    const keyInSession = !!sessionStorage.getItem('privateKey');

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const handleToggleTheme = () => {
        const newTheme = isDark ? 'light-theme' : 'dark-theme';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (toggleTheme) toggleTheme();
    };

    // Reusable primary button matching the site's dark/yellow style
    const PrimaryBtn = ({ children, disabled, onClick, style = {}, className = '' }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`primary-btn ${className}`}
            style={style}
        >
            {children}
        </button>
    );

    // Reusable secondary/outline button
    const SecondaryBtn = ({ 
        children, 
        disabled, 
        onClick, 
        style = {}, 
        as, 
        htmlFor,
        className = ''   // 👈 add this
    }) => {
        const combinedClass = `secondary-btn ${className}`; // 👈 merge

        if (as === 'label') {
            return (
                <label
                    htmlFor={htmlFor}
                    className={combinedClass}
                    style={style}
                >
                    {children}
                </label>
            );
        }

        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className={combinedClass}
                style={style}
            >
                {children}
            </button>
        );
    };

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
            const fetchResponse = await fetch(`${API}/get-encrypted-key`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!fetchResponse.ok) throw new Error('Could not fetch your encrypted key');

            const { encryptedKey, salt, iv } = await fetchResponse.json();
            const privateKeyPem = await decryptPrivateKey(encryptedKey, salt, iv, currentPassphrase);
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

    const handleUploadKey = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadError('');
        setUploadSuccess('');
        const reader = new FileReader();
        reader.onload = (event) => {
            const key = event.target.result.trim();
            if (!key.startsWith('-----BEGIN RSA PRIVATE KEY-----') && !key.startsWith('-----BEGIN PRIVATE KEY-----')) {
                setUploadError('This does not appear to be a valid private key file.');
                return;
            }
            sessionStorage.setItem('privateKey', key);
            setUploadSuccess('Private key loaded for this session.');
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Shared section card style adapts to theme
    return (
        <Container className="mt-4" style={{ maxWidth: '640px' }}>

            {/* Page header */}
            <div className="settings-header">
                <div className="settings-badge">Account</div>
                <h2>Settings</h2>
            </div>

            {/* Appearance */}
            <div className={`settings-section ${isDark ? 'dark' : 'light'}`}>
                <div className={`settings-title ${isDark ? 'dark' : 'light'}`}>
                    {isDark ? <BsMoon size={16} /> : <BsSun size={16} />}
                    Appearance
                </div>
                <p className={`settings-desc ${isDark ? 'dark' : 'light'}`}>Switch between light and dark mode.</p>
                <PrimaryBtn onClick={handleToggleTheme}>
                    {isDark ? <><BsSun size={14} /> Switch to Light Mode</> : <><BsMoon size={14} /> Switch to Dark Mode</>}
                </PrimaryBtn>
            </div>

            {/* Messaging security */}
            <div className={`settings-section ${isDark ? 'dark' : 'light'}`}>
                <div className={`settings-title ${isDark ? 'dark' : 'light'}`}>
                    <BsShieldLock size={16} />
                    Messaging Security
                </div>

                {/* Key status indicator */}
                <div className={`key-status ${keyInSession ? 'loaded' : 'missing'} ${isDark ? 'dark' : 'light'}`}>
                    <span style={{ fontSize: '1.1rem' }}>{keyInSession ? '🔓' : '🔒'}</span>
                    {keyInSession
                        ? 'Your private key is loaded. Messages are decryptable.'
                        : 'Private key not loaded. Log out and back in, then enter your passphrase to read messages.'}
                </div>

                {/* Change passphrase */}
                <div className="settings-block">
                    <p className={`settings-desc ${isDark ? 'dark' : 'light'}`}>
                        Your passphrase protects your private key. Change it here if needed.
                    </p>
                    <PrimaryBtn onClick={() => { setPassphraseError(''); setPassphraseSuccess(''); setShowChangePassphrase(true); }}>
                        Change Passphrase
                    </PrimaryBtn>
                </div>

                {/* Download backup */}
                <div className="settings-block">
                    <p className={`settings-desc ${isDark ? 'dark' : 'light'}`}>
                        Download your raw private key as a backup. Store it somewhere safe like a
                        password manager. This is your only recovery option if you forget your passphrase.
                    </p>
                    <SecondaryBtn onClick={handleDownloadKey} disabled={!keyInSession} className={`secondary-btn themed ${isDark ? 'dark' : 'light'}`}>
                        <BsDownload size={14} /> Download Backup Key
                    </SecondaryBtn>
                    {!keyInSession && (
                        <p  className={`settings-desc ${isDark ? 'dark' : 'light'}`} style={{ marginTop: '0.4rem', marginBottom: 0 }}>
                            Unlock your key with your passphrase first.
                        </p>
                    )}
                </div>

                {/* Upload backup */}
                <div>
                    <p className={`settings-desc ${isDark ? 'dark' : 'light'}`}>
                        If you have a backup key file and forgot your passphrase, upload
                        it here to restore access for this session.
                    </p>
                    <SecondaryBtn as="label" htmlFor="keyUpload" className={`secondary-btn themed ${isDark ? 'dark' : 'light'}`}>
                        <BsUpload size={14} /> Upload Backup Key
                    </SecondaryBtn>
                    <Form.Control
                        id="keyUpload"
                        type="file"
                        accept=".txt,.pem"
                        onChange={handleUploadKey}
                        style={{ display: 'none' }}
                    />
                    {uploadSuccess && (
                        <div className={`status-box success ${isDark ? 'dark' : 'light'}`}>
                            {uploadSuccess}
                        </div>
                    )}
                    {uploadError && (
                        <div className={`status-box error ${isDark ? 'dark' : 'light'}`}>
                            {uploadError}
                        </div>
                    )}
                </div>
            </div>

            {/* Change passphrase modal */}
            <Modal show={showChangePassphrase} onHide={() => setShowChangePassphrase(false)} centered>
                <div className="settings-modal-header">
                    <div>
                        <div style={{
                            display: 'inline-block',
                            background: '#FFD443',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#393933',
                            marginBottom: '0.4rem',
                        }}>
                            Security
                        </div>
                        <h5 style={{ color: '#ffffff', fontWeight: '800', margin: 0 }}>
                            Change Passphrase
                        </h5>
                    </div>
                    <button
                        onClick={() => setShowChangePassphrase(false)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>

                <Modal.Body style={{ padding: '1.5rem 2rem' }}>
                    {passphraseSuccess && (
                        <Alert variant="success" className="py-2">{passphraseSuccess}</Alert>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Current Passphrase</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type={showCurrentPass ? 'text' : 'password'}
                                value={currentPassphrase}
                                onChange={(e) => setCurrentPassphrase(e.target.value)}
                                placeholder="Enter current passphrase"
                            />
                            <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setShowCurrentPass(!showCurrentPass)}>
                                {showCurrentPass ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                            </InputGroup.Text>
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>New Passphrase</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type={showNewPass ? 'text' : 'password'}
                                value={newPassphrase}
                                onChange={(e) => setNewPassphrase(e.target.value)}
                                placeholder="At least 10 characters"
                            />
                            <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setShowNewPass(!showNewPass)}>
                                {showNewPass ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                            </InputGroup.Text>
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Confirm New Passphrase</Form.Label>
                        <Form.Control
                            type={showNewPass ? 'text' : 'password'}
                            value={confirmNewPassphrase}
                            onChange={(e) => setConfirmNewPassphrase(e.target.value)}
                            placeholder="Repeat new passphrase"
                        />
                    </Form.Group>

                    {passphraseError && (
                        <Alert variant="danger" className="py-2">{passphraseError}</Alert>
                    )}
                </Modal.Body>

                <Modal.Footer style={{ borderTop: '1px solid #e0e0dc', padding: '1rem 2rem', gap: '0.5rem' }}>
                    <button onClick={() => setShowChangePassphrase(false)} className="secondary-btn muted">
                        Cancel
                    </button>
                    <PrimaryBtn
                        onClick={handleChangePassphrase}
                        disabled={isSaving || !currentPassphrase || !newPassphrase || !confirmNewPassphrase}
                    >
                        {isSaving ? 'Saving...' : 'Update Passphrase'}
                    </PrimaryBtn>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default UserSettings;