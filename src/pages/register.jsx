import React, { useState, useEffect } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container, Alert } from 'react-bootstrap'
import { saveAs } from 'file-saver';
import bcrypt from 'bcryptjs'
import { useNavigate } from 'react-router-dom'
import { BsX } from 'react-icons/bs'
import Filter from 'bad-words';
import forge from 'node-forge';

function BasicExample() {
    const [email, setEmail] = useState('')
    const [username, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmpass, setConfirmPass] = useState('')
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
    const navigate = useNavigate();
    const profanityFilter = new Filter();
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    
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

                    // Generate RSA key pair
                    const { publicKey, privateKey } = forge.pki.rsa.generateKeyPair(2048);

                    const publicKeyPem = forge.pki.publicKeyToPem(publicKey);
                    const privateKeyPem = forge.pki.privateKeytoPem(privateKey);

                    const saveKeyResponse = await fetch('http://localhost:5000/forumusers/savePublicKey', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, publicKey: publicKeyPem }),
                    });

                    if (saveKeyResponse.ok) {
                        localStorage.setItem('privateKey', privateKeyPem);

                        // Offer user to download private key
                        const blob = new Blob([privateKey], { type: 'text/plain;charset=utf-8' });
                        saveAs(blob, 'privateKey.txt');

                        setStep(3);
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
    const onSubmitForm = async (e) => {
        e.preventDefault();
        setNameError('');

        if (profanityFilter.isProfane(username)) {
            setNameError('Username cannot contain profanity');
            setValidated(true);
            return;
        }

        if (!password || password !== confirmpass || !username.trim()) {
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
                setStep(2); // Proceed to email verification step
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
            <Container>
                <div className='text-center h5 mt-96'>Create Your Account</div>
                <Container className='d-inline-flex justify-content-center'>
                    <Form
                        noValidate
                        validated={validated}
                        className='rounded bg-info p-80'
                        onSubmit={onSubmitForm}
                    >
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
                        <Form.Group>
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        </Form.Group>
                        <Form.Group>
                        <Form.Label>Confirm Password</Form.Label>
                        <Form.Control
                            type='password'
                            onChange={(e) => setConfirmPass(e.target.value)}
                            required
                        />
                        <Form.Control.Feedback type='invalid'>
                            Please make sure passwords are matching.
                        </Form.Control.Feedback>
                        </Form.Group>

                        <Button variant='primary' type='submit' className='mt-24'>
                        Submit
                        </Button>
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
        </Container>
    )
}

export default BasicExample
