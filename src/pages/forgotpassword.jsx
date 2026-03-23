import React, { useState } from 'react'
import { Container, Form, InputGroup, Button } from 'react-bootstrap'
import { BsEnvelopeFill, BsLockFill, BsEye, BsEyeSlash, BsKeyFill } from 'react-icons/bs'
import { useNavigate } from 'react-router-dom'
import { API } from '../components/Utilities/apiUrl';

function ForgotPassword() {
    const [confirmpass, setConfirmPass] = useState("")
    const [email, setEmail] = useState("");
    const [validated, setValidated] = useState(false)
    const [step, setStep] = useState(1);
    const [verificationcode, setVerificationCode] = useState("")
    const [newpassword, setNewPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const navigate = useNavigate();

    // Regex for basic email format validation
    const re =
       /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

    const handleVerificationSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API}/passwordverify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verificationcode })
            })
            const data = await response.json();

            if (data.success) {
                setStep(3);
            } else {
                // Show the error so the user knows what went wrong
                setErrorMessage(data.error || 'Invalid verification code')
            }
        } catch (err) {
            console.error(err)
            setErrorMessage('Something went wrong. Please try again.')
        }
    }

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        // Only proceed if both fields are filled and match
        if (newpassword !== confirmpass) {
            setErrorMessage('Passwords do not match')
            return
        }
        if (!newpassword) return
        try {
            const body = { email, password: newpassword };
            const response = await fetch(`${API}/forumusers`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            console.log(data);
            navigate('/signin');
        } catch (err) {
            console.error(err.message);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault()
        // Don't bother hitting the server with an obviously invalid email
        if (re.test(email)) {
            setStep(2);
            try {
                const response = await fetch(`${API}/passwordreset`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
                const data = await response.json();
                console.log(data)
            } catch (err) {
                console.error(err)
            }
        }
        setValidated(true)
    }

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

    // Shared card wrapper so all 3 steps look identical
    const CardWrapper = ({ badge, title, subtitle, children }) => (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
        }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>
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
                    <h2 style={{
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '1.75rem',
                        margin: 0,
                        letterSpacing: '-0.02em',
                    }}>
                        {title}
                    </h2>
                    <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.875rem',
                        marginTop: '0.4rem',
                        marginBottom: 0,
                    }}>
                        {subtitle}
                    </p>
                </div>
                <div style={{
                    background: '#ffffff',
                    borderRadius: '0 0 16px 16px',
                    padding: '2rem 2.5rem 2.5rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}>
                    {children}
                </div>
            </div>
        </div>
    );

    return (
        <Container>
            {/* Step 1 — collect their email and trigger the reset email */}
            {step === 1 && (
                <CardWrapper
                    badge="Password Reset"
                    title="Forgot Password"
                    subtitle="Enter your email and we will send a reset code"
                >
                    <Form noValidate validated={validated} onSubmit={handleEmailSubmit}>
                        <Form.Group className="mb-4">
                            <Form.Label style={labelStyle}>Email Address</Form.Label>
                            <InputGroup>
                                <InputGroup.Text style={iconGroupStyle}>
                                    <BsEnvelopeFill size={14} />
                                </InputGroup.Text>
                                <Form.Control
                                    type='email'
                                    placeholder='you@example.com'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={inputStyle}
                                />
                            </InputGroup>
                            <Form.Control.Feedback type='invalid'>
                                Please enter a valid email address
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Button
                            type='submit'
                            style={submitButtonStyle}
                            onMouseEnter={e => { e.target.style.background = '#FFD443'; e.target.style.color = '#393933'; }}
                            onMouseLeave={e => { e.target.style.background = '#393933'; e.target.style.color = '#FFD443'; }}
                        >
                            Send Reset Code
                        </Button>

                        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#888', marginTop: '1rem', marginBottom: 0 }}>
                            Remembered it?{' '}
                            <a href="/signin" style={{ color: '#393933', fontWeight: '700', textDecoration: 'none' }}>Sign in</a>
                        </p>
                    </Form>
                </CardWrapper>
            )}

            {/* Step 2 — verify the code they received */}
            {step === 2 && (
                <CardWrapper
                    badge="Step 2 of 3"
                    title="Enter Your Code"
                    subtitle="Check your email for the verification code"
                >
                    <Form noValidate onSubmit={handleVerificationSubmit}>
                        <Form.Group className="mb-4">
                            <Form.Label style={labelStyle}>Verification Code</Form.Label>
                            <InputGroup>
                                <InputGroup.Text style={iconGroupStyle}>
                                    <BsKeyFill size={14} />
                                </InputGroup.Text>
                                <Form.Control
                                    type='text'
                                    placeholder='Enter the code from your email'
                                    value={verificationcode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                    style={inputStyle}
                                />
                            </InputGroup>
                        </Form.Group>

                        <Button
                            type='submit'
                            style={submitButtonStyle}
                            onMouseEnter={e => { e.target.style.background = '#FFD443'; e.target.style.color = '#393933'; }}
                            onMouseLeave={e => { e.target.style.background = '#393933'; e.target.style.color = '#FFD443'; }}
                        >
                            Verify Code
                        </Button>

                        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#888', marginTop: '1rem', marginBottom: 0 }}>
                            Didn't receive it?{' '}
                            <span
                                onClick={() => setStep(1)}
                                style={{ color: '#393933', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Go back
                            </span>
                        </p>
                    </Form>
                </CardWrapper>
            )}

            {/* Step 3 — let them set their new password */}
            {step === 3 && (
                <CardWrapper
                    badge="Step 3 of 3"
                    title="Set New Password"
                    subtitle="Choose a strong password for your account"
                >
                    <Form noValidate onSubmit={handlePasswordReset}>
                        {errorMessage && (
                            <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#d00000', fontWeight: '500' }}>
                                {errorMessage}
                            </div>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label style={labelStyle}>New Password</Form.Label>
                            <InputGroup>
                                <InputGroup.Text style={iconGroupStyle}>
                                    <BsLockFill size={14} />
                                </InputGroup.Text>
                                <Form.Control
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder='Enter new password'
                                    value={newpassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
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

                        <Form.Group className="mb-4">
                            <Form.Label style={labelStyle}>Confirm New Password</Form.Label>
                            <InputGroup>
                                <InputGroup.Text style={iconGroupStyle}>
                                    <BsLockFill size={14} />
                                </InputGroup.Text>
                                <Form.Control
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder='Repeat new password'
                                    value={confirmpass}
                                    onChange={(e) => { setConfirmPass(e.target.value); setErrorMessage(''); }}
                                    required
                                    style={{ ...inputStyle, borderRight: 'none' }}
                                />
                                <InputGroup.Text
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{ ...iconGroupStyle, borderLeft: 'none', borderRight: '1.5px solid #e0e0dc', cursor: 'pointer' }}
                                >
                                    {showConfirmPassword ? <BsEyeSlash size={15} /> : <BsEye size={15} />}
                                </InputGroup.Text>
                            </InputGroup>
                        </Form.Group>

                        <Button
                            type='submit'
                            style={submitButtonStyle}
                            onMouseEnter={e => { e.target.style.background = '#FFD443'; e.target.style.color = '#393933'; }}
                            onMouseLeave={e => { e.target.style.background = '#393933'; e.target.style.color = '#FFD443'; }}
                        >
                            Reset Password
                        </Button>
                    </Form>
                </CardWrapper>
            )}
        </Container>
    )
}

export default ForgotPassword