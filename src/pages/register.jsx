import React, { useState, useEffect } from 'react'
import { Container, Alert, Modal, Button, Form, InputGroup } from 'react-bootstrap'
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom'
import { BsX, BsEye, BsEyeSlash, BsShieldLock, BsDownload, BsPersonFill, BsEnvelopeFill, BsLockFill, BsKeyFill } from 'react-icons/bs'
import Filter from 'bad-words';
import { encryptPrivateKey } from '../components/Utilities/passphraseUtils';
import { API } from '../components/Utilities/apiUrl';

function Registration() {
    const [email, setEmail] = useState('')
    const [username, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmpass, setConfirmPass] = useState('')
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordRequirementsError, setPasswordRequirementsError] = useState('');
    const [passwordsMatchError, setPasswordsMatchError] = useState('');
    const [validated, setValidated] = useState(false);
    const [userData, setUserData] = useState([])
    const [emailError, setEmailError] = useState('')
    const [emailCode, setEmailCode] = useState('')
    const [showError, setShowError] = useState(false);
    const [nameError, setNameError] = useState('');
    const [validCode, setValidCode] = useState(true)
    const [step, setStep] = useState(1);
    const [resendCount, setResendCount] = useState(1);
    const [secondsRemaining, setSecondsRemaining] = useState(3)

    // Key and passphrase state
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [privateKey, setPrivateKey] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [passphraseError, setPassphraseError] = useState('');
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [keyModalStep, setKeyModalStep] = useState('passphrase');

    const navigate = useNavigate();
    const profanityFilter = new Filter();
    // Regex for basic email format check before hitting the server
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

    const validatePassword = (pass) => {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&._:\-+=/\\|])[A-Za-z\d@$!%*#?&._:\-+=/\\|]{8,}$/;
        const isValid = regex.test(pass);
        setPasswordRequirementsError(isValid ? '' : 'Password must be at least 8 characters with 1 number and 1 special character');
        return isValid;
    };

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        validatePassword(newPassword);
        if (confirmpass) {
            setPasswordsMatchError(newPassword === confirmpass ? '' : 'Passwords do not match');
        }
    };

    const handleConfirmPasswordChange = (e) => {
        const newConfirmPass = e.target.value;
        setConfirmPass(newConfirmPass);
        setPasswordsMatchError(password === newConfirmPass ? '' : 'Passwords do not match');
    };

    const getUserDetails = async () => {
        try {
            const response = await fetch(`${API}/forumusers`)
            const jsonData = await response.json()
            setUserData(jsonData)
        } catch (err) {
            console.error(err.message)
        }
    }

    useEffect(() => { getUserDetails() }, [])

    // Email uniqueness check waits 500ms after typing stops to avoid spamming the server
    useEffect(() => {
        let timer;
        if (email !== '') {
            timer = setTimeout(() => {
                const usercheck = userData.find((user) => user.email === email)
                if (usercheck) {
                    setEmailError('Email is already taken')
                    setShowError(true)
                } else {
                    setEmailError('')
                    setShowError(false)
                }
            }, 500);
        } else {
            setEmailError('')
            setShowError(false);
        }
        return () => clearTimeout(timer)
    }, [email, userData])

    // Countdown timer that starts after successful registration then redirects to sign in
    useEffect(() => {
        if (step < 3) return;
        const timer = setTimeout(() => {
            if (secondsRemaining === 0) {
                navigate('/signin');
            } else {
                setSecondsRemaining(secondsRemaining - 1);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [step, secondsRemaining, navigate]);

    const onResendCode = async () => {
        // Cap resends at 3 to prevent abuse then lock them out with step 4
        if (resendCount < 3) {
            try {
                await fetch(`${API}/resendcode`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
            } catch (err) {
                console.error(err);
            }
            setResendCount(resendCount + 1)
        } else {
            setStep(4)
        }
    }

    const onVerifyEmail = async (e) => {
        e.preventDefault();
        if (!re.test(email)) return;
        try {
            const response = await fetch(`${API}/emailverify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emailCode, email }),
            });
            const data = await response.json();

            if (data === true) {
                await fetch(`${API}/forumusers/updateVerified`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });

                // Generate the keypair in a worker so the page doesn't freeze during the RSA operation
                const result = await new Promise((resolve, reject) => {
                    const worker = new Worker(
                        new URL('../workers/keygenWorker.js', import.meta.url),
                        { type: 'module' }
                    );
                    worker.onmessage = (event) => {
                        worker.terminate();
                        if (event.data.success) {
                            resolve({
                                publicKeyPem: event.data.publicKeyPem,
                                privateKeyPem: event.data.privateKeyPem
                            });
                        } else {
                            reject(new Error(event.data.error));
                        }
                    };
                    worker.onerror = (err) => {
                        worker.terminate();
                        reject(err);
                    };
                    worker.postMessage('generate');
                });

                const { publicKeyPem, privateKeyPem: privKeyPem } = result;

                const saveKeyResponse = await fetch(`${API}/forumusers/savePublicKey`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, publicKey: publicKeyPem }),
                });

                if (!saveKeyResponse.ok) {
                    console.error('Failed to save public key');
                    return;
                }

                setPrivateKey(privKeyPem);
                setKeyModalStep('passphrase');
                setShowKeyModal(true);
            } else {
                setValidCode(false);
                setEmailCode('');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const validatePassphrase = (p) => {
        if (p.length < 10) return 'Passphrase must be at least 10 characters';
        return '';
    };

    const handleSetPassphrase = async () => {
        const error = validatePassphrase(passphrase);
        if (error) { setPassphraseError(error); return; }
        if (passphrase !== confirmPassphrase) {
            setPassphraseError('Passphrases do not match');
            return;
        }
        setIsSavingKey(true);
        setPassphraseError('');
        try {
            // The private key is encrypted client side before being sent
            // the passphrase never leaves the browser
            const { encryptedKey, salt, iv } = await encryptPrivateKey(privateKey, passphrase);
            const response = await fetch(`${API}/save-encrypted-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, encryptedKey, salt, iv }),
            });
            if (!response.ok) {
                setPassphraseError('Failed to save encrypted key. Please try again.');
                return;
            }
            setKeyModalStep('download');
        } catch (err) {
            console.error('Error encrypting private key:', err);
            setPassphraseError('Something went wrong. Please try again.');
        } finally {
            setIsSavingKey(false);
        }
    };

    const handleDownloadPrivateKey = () => {
        const blob = new Blob([privateKey], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'smashpoint_private_key.txt');
    };

    const handleFinish = () => {
        setShowKeyModal(false);
        setStep(3);
    };

    const onSubmitForm = async (e) => {
        e.preventDefault();
        setValidated(true);
        setNameError('');
        
        const isPasswordValid = validatePassword(password);
        const doPasswordsMatch = password === confirmpass;
        
        // 1. Check for the email error state from your useEffect
        if (emailError) {
            setShowError(true);
            return; 
        }

        if (profanityFilter.isProfane(username)) {
            setNameError('Username cannot contain profanity');
            return;
        }

        // 2. Explicitly handle empty username
        if (!username.trim()) {
            setNameError('Username is required');
            return;
        }

        if (!isPasswordValid || !doPasswordsMatch) return;

        try {
            const response = await fetch(`${API}/forumusers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
            });

            if (response.ok) {
                setStep(2);
            } else {
                // 3. Catch server-side validation errors (like "Email already exists")
                const errorData = await response.json();
                setEmailError(errorData.message || 'Registration failed. Please try again.');
                setShowError(true);
            }
        } catch (err) {
            console.error(err.message);
            setEmailError('Server connection lost. Please try again.');
            setShowError(true);
        }
    };

    const handleUsernameChange = (e) => {
        const { value } = e.target;
        // Hard cap at 20 characters rather than relying solely on maxLength
        if (value.length <= 20) setUserName(value);
    };

    // Shared input styles to keep things consistent across all fields
    const inputStyle = {
        border: '1.5px solid #e0e0dc',
        borderLeft: 'none',
        background: '#f5f5f3',
        fontSize: '0.9rem',
        padding: '0.6rem 0.9rem',
    };

    const iconGroupStyle = {
        background: '#f5f5f3',
        border: '1.5px solid #e0e0dc',
        borderRight: 'none',
        color: '#393933',
    };

    const labelStyle = {
        fontWeight: '600',
        fontSize: '0.85rem',
        color: '#393933',
    };

    const submitButtonStyle = {
        width: '100%',
        background: '#393933',
        border: 'none',
        borderRadius: '10px',
        padding: '0.75rem',
        fontWeight: '700',
        fontSize: '0.95rem',
        letterSpacing: '0.03em',
        color: '#FFD443',
        transition: 'all 0.2s ease',
    };

    const cardHeader = (badge, title, subtitle) => (
        <div style={{
            background: '#393933',
            borderRadius: '16px 16px 0 0',
            padding: '2rem 2.5rem 1.5rem',
            borderBottom: '4px solid #FFD443',
        }}>
            <div style={{
                display: 'inline-block',
                background: '#FFD443',
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '0.68rem',
                fontWeight: '700',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#393933',
                marginBottom: '0.75rem',
            }}>
                {badge}
            </div>
            <h2 style={{ color: '#ffffff', fontWeight: '800', fontSize: '1.75rem', margin: 0, letterSpacing: '-0.02em' }}>
                {title}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.4rem', marginBottom: 0 }}>
                {subtitle}
            </p>
        </div>
    );

    const cardBody = (children) => (
        <div style={{
            background: '#ffffff',
            borderRadius: '0 0 16px 16px',
            padding: '2rem 2.5rem 2.5rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}>
            {children}
        </div>
    );

    const centeredWrapper = (children) => (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
        }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>
                {children}
            </div>
        </div>
    );

    return (
        <Container>
            {/* Step 1 — account details */}
            {step === 1 && centeredWrapper(
                <>
                    {cardHeader('New Player', 'Create Your Account', 'Join the SmashPoint community')}
                    {cardBody(
                        <Form noValidate validated={validated} onSubmit={onSubmitForm}>
                            <Form.Group className="mb-3">
                                <Form.Label style={labelStyle}>Email Address</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={iconGroupStyle}><BsEnvelopeFill size={14} /></InputGroup.Text>
                                    <Form.Control type='email' placeholder='you@example.com' value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                                </InputGroup>
                                {showError && <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#d00000', fontWeight: '500' }}>{emailError}</div>}
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label style={labelStyle}>Username</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={iconGroupStyle}><BsPersonFill size={14} /></InputGroup.Text>
                                    <Form.Control type='text' placeholder='Your display name' value={username} onChange={handleUsernameChange} required style={inputStyle} />
                                </InputGroup>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                                    {nameError
                                        ? <span style={{ fontSize: '0.8rem', color: '#d00000', fontWeight: '500' }}>{nameError}</span>
                                        : <span style={{ fontSize: '0.78rem', color: '#999' }}>This will be your public display name</span>
                                    }
                                    {/* Counter turns orange when close to the limit */}
                                    <span style={{ fontSize: '0.78rem', color: username.length >= 18 ? '#e39647' : '#bbb', fontWeight: username.length >= 18 ? '600' : '400' }}>
                                        {username.length}/20
                                    </span>
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label style={labelStyle}>Password</Form.Label>
                                <InputGroup hasValidation>
                                    <InputGroup.Text style={iconGroupStyle}><BsLockFill size={14} /></InputGroup.Text>
                                    <Form.Control type={showPassword ? 'text' : 'password'} placeholder='Min 8 chars with number and symbol' value={password} onChange={handlePasswordChange} required isInvalid={validated && !!passwordRequirementsError} style={{ ...inputStyle, borderRight: 'none' }} />
                                    <InputGroup.Text onClick={() => setShowPassword(!showPassword)} style={{ ...iconGroupStyle, borderLeft: 'none', borderRight: '1.5px solid #e0e0dc', cursor: 'pointer' }}>
                                        {showPassword ? <BsEyeSlash size={15} /> : <BsEye size={15} />}
                                    </InputGroup.Text>
                                    {validated && passwordRequirementsError && <Form.Control.Feedback type="invalid">{passwordRequirementsError}</Form.Control.Feedback>}
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label style={labelStyle}>Confirm Password</Form.Label>
                                <InputGroup hasValidation>
                                    <InputGroup.Text style={iconGroupStyle}><BsLockFill size={14} /></InputGroup.Text>
                                    <Form.Control type={showConfirmPassword ? 'text' : 'password'} placeholder='Repeat your password' value={confirmpass} onChange={handleConfirmPasswordChange} required isInvalid={validated && !!passwordsMatchError} style={{ ...inputStyle, borderRight: 'none' }} />
                                    <InputGroup.Text onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ ...iconGroupStyle, borderLeft: 'none', borderRight: '1.5px solid #e0e0dc', cursor: 'pointer' }}>
                                        {showConfirmPassword ? <BsEyeSlash size={15} /> : <BsEye size={15} />}
                                    </InputGroup.Text>
                                    {validated && passwordsMatchError && <Form.Control.Feedback type="invalid">{passwordsMatchError}</Form.Control.Feedback>}
                                </InputGroup>
                            </Form.Group>

                            <Button type='submit' style={submitButtonStyle}
                                onMouseEnter={e => { e.target.style.background = '#FFD443'; e.target.style.color = '#393933'; }}
                                onMouseLeave={e => { e.target.style.background = '#393933'; e.target.style.color = '#FFD443'; }}>
                                Create Account
                            </Button>

                            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#999', marginTop: '1rem', marginBottom: 0 }}>
                                By signing up you agree to our{' '}
                                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#393933', fontWeight: '600' }}>Terms</a>
                                {' '}and{' '}
                                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#393933', fontWeight: '600' }}>Privacy Policy</a>
                            </p>
                            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#888', marginTop: '0.75rem', marginBottom: 0 }}>
                                Already have an account?{' '}
                                <a href="/signin" style={{ color: '#393933', fontWeight: '700', textDecoration: 'none' }}>Sign in</a>
                            </p>
                        </Form>
                    )}
                </>
            )}

            {/* Step 2 — email verification matching the same card design as step 1 */}
            {step === 2 && centeredWrapper(
                <>
                    {cardHeader('Step 2 of 2', 'Verify Your Email', 'Enter the code we sent to ' + email)}
                    {cardBody(
                        <Form noValidate validated={validated} onSubmit={onVerifyEmail}>
                            {!validCode && (
                                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fff0f0', border: '1.5px solid #d00000', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#d00000', fontWeight: '500' }}>Invalid verification code</span>
                                    <BsX size={18} style={{ cursor: 'pointer', color: '#d00000' }} onClick={() => setValidCode(true)} />
                                </div>
                            )}

                            <Form.Group className="mb-4">
                                <Form.Label style={labelStyle}>Verification Code</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={iconGroupStyle}><BsKeyFill size={14} /></InputGroup.Text>
                                    <Form.Control
                                        type='text'
                                        placeholder='Enter your code'
                                        value={emailCode}
                                        onChange={(e) => setEmailCode(e.target.value)}
                                        required
                                        isInvalid={!validCode}
                                        style={inputStyle}
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Button type='submit' style={submitButtonStyle}
                                onMouseEnter={e => { e.target.style.background = '#FFD443'; e.target.style.color = '#393933'; }}
                                onMouseLeave={e => { e.target.style.background = '#393933'; e.target.style.color = '#FFD443'; }}>
                                Verify Email
                            </Button>

                            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#888', marginTop: '1rem', marginBottom: 0 }}>
                                Didn't receive it?{' '}
                                <span onClick={onResendCode} style={{ color: '#393933', fontWeight: '700', cursor: 'pointer' }}>
                                    Resend code
                                </span>
                            </p>
                        </Form>
                    )}
                </>
            )}

            {/* Step 3 — success countdown to redirect */}
            {step === 3 && centeredWrapper(
                <>
                    {cardHeader('All Done', 'Account Created', 'Welcome to SmashPoint')}
                    {cardBody(
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
                            <p style={{ color: '#555', marginBottom: '0.5rem' }}>Your account has been created successfully.</p>
                            <p style={{ color: '#999', fontSize: '0.85rem' }}>Redirecting in {secondsRemaining} seconds...</p>
                        </div>
                    )}
                </>
            )}

            {step === 4 && centeredWrapper(
                <>
                    {cardHeader('Limit Reached', 'Too Many Attempts', 'Please try again later')}
                    {cardBody(
                        <p style={{ color: '#555', textAlign: 'center', marginBottom: 0 }}>
                            You have requested too many verification codes. Please wait a while before trying again.
                        </p>
                    )}
                </>
            )}

            {step === 5 && centeredWrapper(
                <>
                    {cardHeader('Limit Reached', 'Too Many Attempts', 'Please try again later')}
                    {cardBody(
                        <p style={{ color: '#555', textAlign: 'center', marginBottom: 0 }}>
                            Too many failed verification attempts. Please try registering again.
                        </p>
                    )}
                </>
            )}

            {/* Forced modal — user must set a passphrase and optionally download their key before continuing */}
            <Modal show={showKeyModal} onHide={() => {}} backdrop="static" keyboard={false}>
                <Modal.Header>
                    <Modal.Title>
                        <BsShieldLock className="me-2" />
                        {keyModalStep === 'passphrase' ? 'Set Your Messaging Passphrase' : 'Back Up Your Private Key'}
                    </Modal.Title>
                </Modal.Header>

                {/* Step A — set the passphrase that protects their private key */}
                {keyModalStep === 'passphrase' && (
                    <>
                        <Modal.Body>
                            <Alert variant="info">
                                <strong>What is this?</strong> Your messages are end-to-end encrypted.
                                Your private key unlocks them and your passphrase protects that key.
                                You will enter this passphrase each time you log in to read your messages.
                            </Alert>
                            <Alert variant="warning">
                                <strong>Important:</strong> If you forget your passphrase your message
                                history cannot be recovered. There is no reset option.
                            </Alert>
                            <Form.Group className="mb-3">
                                <Form.Label>Passphrase</Form.Label>
                                <InputGroup>
                                    <Form.Control type={showPassphrase ? 'text' : 'password'} placeholder="At least 10 characters" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
                                    <InputGroup.Text>
                                        <Button variant="link" onClick={() => setShowPassphrase(!showPassphrase)} className="p-0">
                                            {showPassphrase ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                                        </Button>
                                    </InputGroup.Text>
                                </InputGroup>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Confirm Passphrase</Form.Label>
                                <Form.Control type={showPassphrase ? 'text' : 'password'} placeholder="Repeat your passphrase" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} />
                            </Form.Group>
                            {passphraseError && <Alert variant="danger">{passphraseError}</Alert>}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="primary" onClick={handleSetPassphrase} disabled={isSavingKey || !passphrase || !confirmPassphrase}>
                                {isSavingKey ? 'Saving...' : 'Set Passphrase'}
                            </Button>
                        </Modal.Footer>
                    </>
                )}

                {/* Step B — offer a plaintext backup in case they ever forget their passphrase */}
                {keyModalStep === 'download' && (
                    <>
                        <Modal.Body>
                            <Alert variant="success"><strong>Passphrase set!</strong> Your private key is now protected.</Alert>
                            <p>We strongly recommend downloading a backup of your raw private key and storing it somewhere safe like a password manager or USB drive.</p>
                            <p>If you ever forget your passphrase this backup file is your only way to recover your messages.</p>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="primary" onClick={handleDownloadPrivateKey}><BsDownload className="me-2" />Download Backup Key</Button>
                            <Button variant="secondary" onClick={handleFinish}>Skip (not recommended)</Button>
                        </Modal.Footer>
                    </>
                )}
            </Modal>
        </Container>
    );
}

export default Registration;