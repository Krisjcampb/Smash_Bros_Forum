import React, { useState, useEffect } from 'react';
import { Container, Form, Alert, Modal, InputGroup } from 'react-bootstrap';
import { saveAs } from 'file-saver';
import { BsEye, BsEyeSlash, BsShieldLock, BsDownload, BsUpload, BsMoon, BsSun, BsBell, BsBellSlash } from 'react-icons/bs';
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
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushError, setPushError] = useState('');
    const [pushSupported, setPushSupported] = useState(true);
    const token = localStorage.getItem('token');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light-theme');
    const isDark = theme === 'dark-theme';
    const keyInSession = !!sessionStorage.getItem('privateKey');

    // Check current subscription/permission state on mount
    useEffect(() => {
        const checkPushStatus = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                setPushSupported(false);
                return;
            }
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setPushEnabled(!!subscription && Notification.permission === 'granted');
            } catch (err) {
                console.error('Error checking push status:', err);
            }
        };
        checkPushStatus();
    }, []);

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
    };

    const handleEnablePush = async () => {
        setPushError('');
        setPushLoading(true);
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                setPushSupported(false);
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setPushError(permission === 'denied'
                    ? 'Notifications are blocked. Enable them in your browser/site settings to turn this on.'
                    : 'Permission was not granted.');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
                });
            }

            const response = await fetch(`${API}/push-subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ subscription })
            });

            if (!response.ok) throw new Error('Failed to save subscription');
            setPushEnabled(true);
        } catch (err) {
            console.error('Push registration failed:', err);
            setPushError('Something went wrong enabling notifications. Please try again.');
        } finally {
            setPushLoading(false);
        }
    };

    const handleDisablePush = async () => {
        setPushError('');
        setPushLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                // Optional: tell the backend so it stops trying to send to a dead subscription
                await fetch(`${API}/push-unsubscribe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                });
            }
            setPushEnabled(false);
        } catch (err) {
            console.error('Push unsubscribe failed:', err);
            setPushError('Something went wrong disabling notifications.');
        } finally {
            setPushLoading(false);
        }
    };

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
        <Container className="mt-4 settings-page-container">

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

            {/* Notifications */}
            <div className={`settings-section ${isDark ? 'dark' : 'light'}`}>
                <div className={`settings-title ${isDark ? 'dark' : 'light'}`}>
                    {pushEnabled ? <BsBell size={16} /> : <BsBellSlash size={16} />}
                    Notifications
                </div>
                <p className={`settings-desc ${isDark ? 'dark' : 'light'}`}>
                    Get notified on this device when you receive a new message.
                </p>

                {!pushSupported ? (
                    <p className={`settings-desc ${isDark ? 'dark' : 'light'}`}>
                        Push notifications aren't supported on this browser/device.
                    </p>
                ) : (
                    <PrimaryBtn
                        onClick={pushEnabled ? handleDisablePush : handleEnablePush}
                        disabled={pushLoading}
                    >
                        {pushLoading
                            ? 'Working...'
                            : pushEnabled
                                ? 'Disable Message Notifications'
                                : 'Enable Message Notifications'}
                    </PrimaryBtn>
                )}

                {pushError && (
                    <div className={`status-box error ${isDark ? 'dark' : 'light'}`}>
                        {pushError}
                    </div>
                )}
            </div>

            {/* Messaging security */}
            <div className={`settings-section ${isDark ? 'dark' : 'light'}`}>
                <div className={`settings-title ${isDark ? 'dark' : 'light'}`}>
                    <BsShieldLock size={16} />
                    Messaging Security
                </div>

                {/* Key status indicator */}
                <div className={`key-status ${keyInSession ? 'loaded' : 'missing'} ${isDark ? 'dark' : 'light'}`}>
                    <span className="key-status-icon">{keyInSession ? '🔓' : '🔒'}</span>
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
                        <p  className={`settings-desc ${isDark ? 'dark' : 'light'} settings-block-paragraph`}>
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
                        <div className="settings-modal-badge">Security</div>
                        <h5 className="edit-modal-title">
                            Change Passphrase
                        </h5>
                    </div>
                    <button
                        onClick={() => setShowChangePassphrase(false)}
                        className="edit-modal-close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                </div>

                <Modal.Body className="modal-body-padding">
                    {passphraseSuccess && (
                        <Alert variant="success" className="py-2">{passphraseSuccess}</Alert>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label className="modal-label">Current Passphrase</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type={showCurrentPass ? 'text' : 'password'}
                                value={currentPassphrase}
                                onChange={(e) => setCurrentPassphrase(e.target.value)}
                                placeholder="Enter current passphrase"
                            />
                            <InputGroup.Text className="modal-input-group-text-cursor" onClick={() => setShowCurrentPass(!showCurrentPass)}>
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

                <Modal.Footer className="modal-footer-settings">
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