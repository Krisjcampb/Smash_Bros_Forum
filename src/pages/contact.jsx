import React, { useState } from 'react'
import { Container, Form, InputGroup, Button } from 'react-bootstrap'
import { BsPersonFill, BsEnvelopeFill, BsChatFill } from 'react-icons/bs'
import { API } from '../components/Utilities/apiUrl';

function Contact() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        try{
            const response = await fetch(`${API}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({email, name, message}),
            })
            const data = await response.json();
            
            if(data.success) {
                console.log("Contact message successfully sent.")
                setSubmitted(true)
            }
        } catch (error) {
            console.error('Error submitting contact form:', error)
        }
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

    return (
        <Container>
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 1rem',
            }}>
                <div style={{ width: '100%', maxWidth: '520px' }}>

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
                            Get In Touch
                        </div>
                        <h2 style={{
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '1.75rem',
                            margin: 0,
                            letterSpacing: '-0.02em',
                        }}>
                            Contact Us
                        </h2>
                        <p style={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.875rem',
                            marginTop: '0.4rem',
                            marginBottom: 0,
                        }}>
                            Have a question or suggestion? We would love to hear from you.
                        </p>
                    </div>

                    <div style={{
                        background: '#ffffff',
                        borderRadius: '0 0 16px 16px',
                        padding: '2rem 2.5rem 2.5rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    }}>
                        {submitted ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
                                <h5 style={{ fontWeight: '700', color: '#393933' }}>Message Sent</h5>
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                                    Thanks for reaching out. We will get back to you as soon as we can.
                                </p>
                            </div>
                        ) : (
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label style={labelStyle}>Your Name</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text style={iconGroupStyle}><BsPersonFill size={14} /></InputGroup.Text>
                                        <Form.Control
                                            type='text'
                                            placeholder='Your name'
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            required
                                            style={inputStyle}
                                        />
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label style={labelStyle}>Email Address</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text style={iconGroupStyle}><BsEnvelopeFill size={14} /></InputGroup.Text>
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

                                <Form.Group className="mb-4">
                                    <Form.Label style={labelStyle}>Message</Form.Label>
                                    <InputGroup style={{ alignItems: 'flex-start' }}>
                                        <InputGroup.Text style={{ ...iconGroupStyle, paddingTop: '0.65rem' }}>
                                            <BsChatFill size={14} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            as='textarea'
                                            rows={5}
                                            placeholder='What is on your mind?'
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            required
                                            style={{ ...inputStyle, resize: 'none' }}
                                        />
                                    </InputGroup>
                                </Form.Group>

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
                                    Send Message
                                </Button>
                            </Form>
                        )}
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default Contact