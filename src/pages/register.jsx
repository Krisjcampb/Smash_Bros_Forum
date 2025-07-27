import React, { useState, useEffect } from 'react'
import { Container, Alert, Modal, Row, Col, Button, Form, InputGroup } from 'react-bootstrap'
import { saveAs } from 'file-saver';
import bcrypt from 'bcryptjs'
import { useNavigate } from 'react-router-dom'
import { BsX, BsEye, BsEyeSlash } from 'react-icons/bs'
import Filter from 'bad-words';
import forge from 'node-forge';

function BasicExample() {
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
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [privateKey, setPrivateKey] = useState('');
    const navigate = useNavigate();
    const profanityFilter = new Filter();
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    
    const validatePassword = (pass) => {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
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
        const response = await fetch('http://localhost:5000/forumusers')
        const jsonData = await response.json()

        setUserData(jsonData)
      } catch (err) {
        console.error(err.message)
      }
    }
    useEffect(() => {
      getUserDetails()
    }, [])

    useEffect(() => {
        let timer;
        if (email !== ''){
            timer = setTimeout(() => {
                const usercheck = userData.find((user) => user.email === email)
                if (usercheck) {
                  setEmailError('Email is already taken')
                  setShowError(true)
                } else {
                  setEmailError('')
                  setShowError(false)
                }       
            }, 500)   ;  
        } else{
            setEmailError('')
            setShowError(false);
        }
        return () => clearTimeout(timer)
    }, [email, userData])

    useEffect(() => {
        if (step < 3) {
            return;
        }

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
        if(resendCount < 3) {
            try {
            await fetch("http://localhost:5000/resendcode", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            console.log("Code resent successfully");
            } catch (err) {
                console.error(err);
            }
            setResendCount(resendCount+1)
        }
        else{
            setStep(4)
        }
    }

    const onVerifyEmail = async (e) => {
        e.preventDefault();
        if (re.test(email)) {
            try {
                const response = await fetch("http://localhost:5000/emailverify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emailCode, email }),
                });
                const data = await response.json();
                console.log(data);
                if (data === true) {
                    const updateResponse = await fetch('http://localhost:5000/forumusers/updateVerified', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                    });

                    if (!updateResponse.ok) {
                        console.error('Failed to update user verification status');
                    return;
                    }
                    // Generate RSA key pair
                    const { publicKey, privateKey } = forge.pki.rsa.generateKeyPair(2048);

                    const publicKeyPem = forge.pki.publicKeyToPem(publicKey);
                    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

                    const saveKeyResponse = await fetch('http://localhost:5000/forumusers/savePublicKey', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, publicKey: publicKeyPem }),
                    });

                    if (saveKeyResponse.ok) {
                        localStorage.setItem('privateKey', privateKeyPem);
                        setPrivateKey(privateKeyPem)

                        setShowKeyModal(true);
                    } else {
                        console.error('Failed to save public key');
                    }
                } else {
                    setValidCode(false);
                    setEmailCode('');
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleDownloadPrivateKey = () => {
        const blob = new Blob([privateKey], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'privateKey.txt');
        setShowKeyModal(false);
        setStep(3)
    }

    const handleSkipDownload = () => {
        setShowKeyModal(false);
        setStep(3)
    }

    const onSubmitForm = async (e) => {
        e.preventDefault();
        setValidated(true);
        setNameError('');
        
        const isPasswordValid = validatePassword(password);
        const doPasswordsMatch = password === confirmpass;
        
        if (!doPasswordsMatch) {
            setPasswordsMatchError('Passwords do not match');
        }

        if (profanityFilter.isProfane(username)) {
            setNameError('Username cannot contain profanity');
            setValidated(true);
            return;
        }

        if (!isPasswordValid || !doPasswordsMatch || !username.trim()) {
            setValidated(true);
            return;
        }

        try {
            const hashedpassword = bcrypt.hashSync(password, 10);
            const body = { email, username, hashedpassword };
            const response = await fetch('http://localhost:5000/forumusers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            });

            if (response.ok) {
            setStep(2);
            } else {
            console.error('Failed to submit form');
            }
        } catch (err) {
            console.error(err.message);
        }
    };

    const handleUsernameChange = (e) => {
        const { value } = e.target;
        if (value.length <= 20) {
            setUserName(value);
        } 
    }

    return (
        <Container>
            {step === 1 && (
            <Container className='register-container'>
                <div className='text-center h3 form-title'>Create Your Account</div>
                <Container className='d-flex justify-content-center'>
                    <Form
                        noValidate
                        validated={validated}
                        className='rounded bg-info p-80'
                        onSubmit={onSubmitForm}
                        style={{ width: '100%', maxWidth: '600px' }}
                    >
                    <div style={{ maxWidth: '260px', margin: '0 auto'}}>
                        <Form.Group className='mb-3'>
                        <Form.Label>Email address</Form.Label>
                        <Form.Control
                            type='email'
                            placeholder='Enter email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        {showError && <Alert variant="danger" className="p-4 m-4">{emailError}</Alert>}
                        </Form.Group>
                        <Form.Group className='mb-3'>
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                            type='text'
                            placeholder='Enter username'
                            value={username}
                            onChange={handleUsernameChange}
                            required
                        />
                        {nameError && <Alert variant="danger">{nameError}</Alert>}
                        <Form.Text className='text-muted'>
                            This will be your display name.
                        </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                        <Form.Label>Password</Form.Label>
                            <InputGroup hasValidation>
                                <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={handlePasswordChange}
                                required
                                isInvalid={validated && !!passwordRequirementsError}
                                />
                                <InputGroup.Text>
                                <Button
                                    variant="link"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="p-0"
                                >
                                    {showPassword ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                                </Button>
                                </InputGroup.Text>
                                {validated && passwordRequirementsError && (
                                <Form.Control.Feedback type="invalid">
                                    {passwordRequirementsError}
                                </Form.Control.Feedback>
                                )}
                            </InputGroup>                        
                            <div style={{ minHeight: '1.5rem' }}>
                                {validated && passwordRequirementsError ? (
                                <div className="text-danger small">{!passwordRequirementsError}</div>
                                ) : (
                                <Form.Text className="text-muted">
                                    Minimum 8 characters with at least 1 number and 1 special character
                                </Form.Text>
                                )}
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                        <Form.Label>Confirm Password</Form.Label>
                            <InputGroup hasValidation>
                                <Form.Control
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmpass}
                                onChange={handleConfirmPasswordChange}
                                required
                                isInvalid={validated && !!passwordsMatchError}
                                />
                                <InputGroup.Text>
                                <Button
                                    variant="link"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="p-0"
                                >
                                    {showConfirmPassword ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                                </Button>
                                </InputGroup.Text>
                                {validated && passwordsMatchError && (
                                <Form.Control.Feedback type="invalid">
                                    {passwordsMatchError}
                                </Form.Control.Feedback>
                                )}
                            </InputGroup>
                        </Form.Group>
                        <Row className="mt-3 justify-content-center">
                            <Col xs={12} md={10} lg={8}>
                                <Form.Text className="text-muted text-center d-block" style={{ fontSize: '0.9rem' }}>
                                By creating an account for <strong>SmashPoint</strong>, you agree to our{' '}
                                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and{' '}
                                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                                </Form.Text>
                            </Col>
                        </Row>

                        <Button variant='primary' type='submit' className='mt-24'>
                        Submit
                        </Button>
                        </div>
                    </Form>
                    
                </Container>
            </Container>
            )}
            {step === 2 && (
            <Container>
                <div className='text-center h5 mt-96'>A verification code has been sent to your email</div>
                <Container className='d-inline-flex justify-content-center'>
                    <Form
                        noValidate
                        validated={validated}
                        className='rounded bg-info p-80'
                        onSubmit={onVerifyEmail}
                    >
                        <div className='mt-2' style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={onResendCode}>
                            Resend Code
                        </div>
                        { !validCode && (
                            <div className="alert alert-danger" role="alert">
                                Invalid validation code
                                <Button variant="link" onClick={() => setValidCode(true)}>
                                    <BsX />
                                </Button>
                            </div>
                        )}
                        <Form.Group className='mb-3'>
                            <Form.Label>Enter your code</Form.Label>
                            <Form.Control
                                type='emailcode'
                                placeholder='Enter email code'
                                value={emailCode}
                                onChange={(e) => setEmailCode(e.target.value)}
                                required
                                isInvalid={!validCode}
                            />
                        </Form.Group>
                        <Button variant='primary' type='submit' className='mt-24'>
                            Submit
                        </Button>
                    </Form>
                </Container>
            </Container>
            )}
            {step === 3 && (
            <Container>
                <div className='text-center h5 mt-96'>Success! You will be redirected in {secondsRemaining} seconds...</div>
            </Container>
            )}
            {step === 4 && (
            <Container>
                <div className='text-center h5 mt-96'>Too many resend requests. Please try again later.</div>
            </Container>
            )}
            {step === 5 && (
            <Container>
                <div className='text-center h5 mt-96'>Too many verification attempts. Please try again later.</div>
            </Container>
            )}

            <Modal show={showKeyModal} onHide={handleSkipDownload}>
                <Modal.Header closeButton>
                    <Modal.Title>Important: Download Your Private Key</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Your private key is essential for providing account security. Please download it and keep it
                        safe. If you lose your private key, you may lose access to certain features.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleDownloadPrivateKey}>
                        Download Now
                    </Button>
                    <Button variant="secondary" onClick={handleSkipDownload}>
                        Skip
                    </Button>
                </Modal.Footer>
            </Modal>

        </Container>
    )
}

export default BasicExample
