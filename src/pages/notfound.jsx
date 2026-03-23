import React from 'react'
import { Container, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
            <div style={{
                background: '#393933',
                borderRadius: '16px 16px 0 0',
                padding: '2rem 3rem 1.5rem',
                borderBottom: '4px solid #FFD443',
                textAlign: 'center',
                width: '100%',
                maxWidth: '480px',
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
                    Error 404
                </div>
                <h1 style={{ color: '#ffffff', fontWeight: '800', fontSize: '4rem', margin: 0, letterSpacing: '-0.02em' }}>
                    404
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.4rem', marginBottom: 0 }}>
                    Page not found
                </p>
            </div>
            <div style={{
                background: '#ffffff',
                borderRadius: '0 0 16px 16px',
                padding: '2rem 3rem',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                textAlign: 'center',
                width: '100%',
                maxWidth: '480px',
            }}>
                <p style={{ color: '#555', marginBottom: '1.5rem' }}>
                    The page you are looking for doesn't exist or may have been moved.
                </p>
                <div className="d-flex gap-3 justify-content-center">
                    <Button
                        onClick={() => navigate(-1)}
                        variant="outline-secondary"
                        style={{ borderRadius: '8px', fontWeight: '600' }}
                    >
                        Go Back
                    </Button>
                    <Button
                        onClick={() => navigate('/')}
                        style={{
                            background: '#393933',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            color: '#FFD443',
                        }}
                        onMouseEnter={e => { e.target.style.background = '#FFD443'; e.target.style.color = '#393933'; }}
                        onMouseLeave={e => { e.target.style.background = '#393933'; e.target.style.color = '#FFD443'; }}
                    >
                        Go Home
                    </Button>
                </div>
            </div>
        </Container>
    )
}