import React, { useState } from 'react'
import { Container, Alert, Form, InputGroup, Button } from 'react-bootstrap'
import { NavLink, useNavigate } from 'react-router-dom'
import { BsEnvelopeFill, BsLockFill, BsEye, BsEyeSlash } from 'react-icons/bs'
import PassphraseUnlock from '../components/Utilities/passphraseUnlock';
import { API } from '../components/Utilities/apiUrl';

function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('')
    const [showPassphraseModal, setShowPassphraseModal] = useState(false);
    const navigate = useNavigate();

    const userLogin = async (e) => {
        e.preventDefault()
        try {
            const response = await fetch(`${API}/userlogin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('token', data.token)
                // Token is stored so now prompt for passphrase to unlock the private key
                setShowPassphraseModal(true);
            } else {
                setErrorMessage('Invalid username or password')
            }
        } catch (err) {
            console.log(err.message)
        }
    };

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

    return (
        <Container>
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 1rem',
            }}>
                <div style={{ width: '100%', maxWidth: '440px' }}>

                    {/* Dark header band */}
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
                            Welcome Back
                        </div>
                        <h2 style={{
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '1.75rem',
                            margin: 0,
                            letterSpacing: '-0.02em',
                        }}>
                            Sign In
                        </h2>
                        <p style={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.875rem',
                            marginTop: '0.4rem',
                            marginBottom: 0,
                        }}>
                            Sign in to your SmashPoint account
                        </p>
                    </div>

                    {/* White form body */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '0 0 16px 16px',
                        padding: '2rem 2.5rem 2.5rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    }}>
                        {errorMessage && (
                            <Alert variant="danger" style={{ fontSize: '0.85rem' }}>
                                {errorMessage}
                            </Alert>
                        )}

                        <Form onSubmit={userLogin}>
                            <Form.Group className="mb-3">
                                <Form.Label style={labelStyle}>Email Address</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={iconGroupStyle}>
                                        <BsEnvelopeFill size={14} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type='email'
                                        placeholder='you@example.com'
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        style={inputStyle}
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-2">
                                <Form.Label style={labelStyle}>Password</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={iconGroupStyle}>
                                        <BsLockFill size={14} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder='Enter your password'
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        style={{ ...inputStyle, borderRight: 'none' }}
                                    />
                                    <InputGroup.Text
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ ...iconGroupStyle, borderLeft: 'none', borderRight: '1.5px solid #e0e0dc', cursor: 'pointer' }}
                                    >
                                        {showPassword ? <BsEyeSlash size={15} /> : <BsEye size={15} />}
                                    </InputGroup.Text>
                                </InputGroup>
                            </Form.Group>

                            <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
                                <NavLink to='/forgotpassword' style={{ fontSize: '0.82rem', color: '#393933', fontWeight: '600' }}>
                                    Forgot password?
                                </NavLink>
                            </div>

                            <Button
                                type='submit'
                                style={{
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
                                }}
                                onMouseEnter={e => { e.target.style.background = '#FFD443'; e.target.style.color = '#393933'; }}
                                onMouseLeave={e => { e.target.style.background = '#393933'; e.target.style.color = '#FFD443'; }}
                            >
                                Log In
                            </Button>

                            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#888', marginTop: '1rem', marginBottom: 0 }}>
                                Don't have an account?{' '}
                                <NavLink to='/register' style={{ color: '#393933', fontWeight: '700', textDecoration: 'none' }}>
                                    Create one
                                </NavLink>
                            </p>
                        </Form>
                    </div>
                </div>
            </div>

            {/* Passphrase modal appears after a successful login to load the private key into session */}
            <PassphraseUnlock
                show={showPassphraseModal}
                onUnlocked={async () => {
                    setShowPassphraseModal(false);
                    const token = localStorage.getItem('token');
                    const keyResponse = await fetch(`${API}/get-encrypted-key`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });

                    if (keyResponse.status === 404) {
                        navigate('/setup-keys');
                    } else {
                        navigate('/');
                        navigate(0);
                    }
                }}
                onSkip={async () => {
                    setShowPassphraseModal(false);
                    const token = localStorage.getItem('token');
                    const keyResponse = await fetch(`${API}/get-encrypted-key`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });

                    if (keyResponse.status === 404) {
                        navigate('/setup-keys');
                    } else {
                        navigate('/');
                        navigate(0);
                    }
                }}
            />
        </Container>
    )
}

export default SignIn