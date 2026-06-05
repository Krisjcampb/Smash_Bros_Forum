import React, { useState, useEffect } from 'react'
import React, { useState, useEffect } from 'react'
import { Container, Alert, Button, Form, InputGroup } from 'react-bootstrap'
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom'
import { BsShieldLock, BsEye, BsEyeSlash, BsDownload } from 'react-icons/bs'
import { encryptPrivateKey } from '../components/Utilities/passphraseUtils';
import { API } from '../components/Utilities/apiUrl';

export default function SetupKeys() {
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [passphraseError, setPassphraseError] = useState('');
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const [privateKey, setPrivateKey] = useState('');
    const [keyStep, setKeyStep] = useState('generating'); // generating → passphrase → download
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // Generate a fresh keypair as soon as the page loads
    useEffect(() => {
        const generate = async () => {
            setIsGeneratingKey(true);
            try {
                const result = await new Promise((resolve, reject) => {
                    const worker = new Worker(
                        new URL('../workers/keygenWorker.js', import.meta.url),
                        { type: 'module' }
                    );
                    worker.onmessage = (event) => {
                        worker.terminate();
                        if (event.data.success) resolve(event.data);
                        else reject(new Error(event.data.error));
                    };
                    worker.onerror = (err) => { worker.terminate(); reject(err); };
                    worker.postMessage('generate');
                });

                // Save the new public key
                await fetch(`${API}/forumusers/savePublicKey`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ publicKey: result.publicKeyPem }),
                });

                setPrivateKey(result.privateKeyPem);
                setKeyStep('passphrase');
            } catch (err) {
                console.error('Key generation failed:', err);
            } finally {
                setIsGeneratingKey(false);
            }
        };
        generate();
    }, [token]);

    const handleSetPassphrase = async () => {
        if (passphrase.length < 10) { setPassphraseError('Passphrase must be at least 10 characters'); return; }
        if (passphrase !== confirmPassphrase) { setPassphraseError('Passphrases do not match'); return; }
        setIsSavingKey(true);
        setPassphraseError('');
        try {
            const { encryptedKey, salt, iv } = await encryptPrivateKey(privateKey, passphrase);
            const response = await fetch(`${API}/save-encrypted-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ encryptedKey, salt, iv }),
            });
            if (!response.ok) { setPassphraseError('Failed to save. Please try again.'); return; }
            setKeyStep('download');
        } catch (err) {
            setPassphraseError('Something went wrong. Please try again.');
        } finally {
            setIsSavingKey(false);
        }
    };

    const handleFinish = () => {
        setPrivateKey('');
        setPassphrase('');
        setConfirmPassphrase('');
        navigate('/');
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>
                <div style={{ background: '#393933', borderRadius: '16px 16px 0 0', padding: '2rem 2.5rem 1.5rem', borderBottom: '4px solid #FFD443' }}>
                    <div style={{ display: 'inline-block', background: '#FFD443', borderRadius: '6px', padding: '3px 10px', fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#393933', marginBottom: '0.75rem' }}>
                        One More Step
                    </div>
                    <h2 style={{ color: '#ffffff', fontWeight: '800', fontSize: '1.75rem', margin: 0 }}>
                        <BsShieldLock className="me-2" />
                        Set Up Messaging
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.4rem', marginBottom: 0 }}>
                        Your account needs an encryption key to use direct messages
                    </p>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '0 0 16px 16px', padding: '2rem 2.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

                    {isGeneratingKey && (
                        <div className="text-center py-3">
                            <span className="spinner-border spinner-border-sm me-2" />
                            Generating your encryption keys...
                        </div>
                    )}

                    {keyStep === 'passphrase' && (
                        <>
                            <Alert variant="info">
                                <strong>What is this?</strong> Your messages are end-to-end encrypted. Your passphrase protects your private key and will be required each time you log in to read messages.
                            </Alert>
                            <Alert variant="warning">
                                <strong>Important:</strong> If you forget your passphrase your message history cannot be recovered.
                            </Alert>
                            <Form.Group className="mb-3">
                                <Form.Label>Passphrase</Form.Label>
                                <InputGroup>
                                    <Form.Control type={showPassphrase ? 'text' : 'password'} placeholder="At least 10 characters" value={passphrase} onChange={e => setPassphrase(e.target.value)} />
                                    <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setShowPassphrase(!showPassphrase)}>
                                        {showPassphrase ? <BsEyeSlash /> : <BsEye />}
                                    </InputGroup.Text>
                                </InputGroup>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Confirm Passphrase</Form.Label>
                                <Form.Control type={showPassphrase ? 'text' : 'password'} placeholder="Repeat your passphrase" value={confirmPassphrase} onChange={e => setConfirmPassphrase(e.target.value)} />
                            </Form.Group>
                            {passphraseError && <Alert variant="danger">{passphraseError}</Alert>}
                            <Button
                                onClick={handleSetPassphrase}
                                disabled={isSavingKey || !passphrase || !confirmPassphrase}
                                style={{ width: '100%', background: '#393933', border: 'none', color: '#FFD443', fontWeight: '700', borderRadius: '10px', padding: '0.75rem' }}
                            >
                                {isSavingKey ? 'Saving...' : 'Set Passphrase'}
                            </Button>
                        </>
                    )}

                    {keyStep === 'download' && (
                        <>
                            <Alert variant="success"><strong>Passphrase set!</strong> Your private key is now protected.</Alert>
                            <p>We strongly recommend downloading a backup of your private key and storing it somewhere safe.</p>
                            <p>If you ever forget your passphrase this is your only way to recover your messages.</p>
                            <div className="d-flex gap-2">
                                <Button variant="primary" onClick={() => { const blob = new Blob([privateKey], { type: 'text/plain' }); saveAs(blob, 'smashpoint_private_key.txt'); }}>
                                    <BsDownload className="me-2" />Download Key
                                </Button>
                                <Button variant="secondary" onClick={handleFinish}>Skip (not recommended)</Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Container>
    );
}