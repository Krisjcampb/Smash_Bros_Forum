import React from 'react';
import { Container, Button } from 'react-bootstrap';

// Error boundaries must be class components since no hook equivalent exists for componentDidCatch
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Log to console in dev so the stack trace is still visible
        console.error('ErrorBoundary caught an error:', error, info);
    }

    render() {
        if (this.state.hasError) {
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
                            Something went wrong
                        </div>
                        <h2 style={{ color: '#ffffff', fontWeight: '800', fontSize: '2rem', margin: 0 }}>
                            Unexpected Error
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.4rem', marginBottom: 0 }}>
                            The app ran into a problem
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
                            Try refreshing the page. If the problem keeps happening please use the feedback form to let us know.
                        </p>
                        <div className="d-flex gap-3 justify-content-center">
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline-secondary"
                                style={{ borderRadius: '8px', fontWeight: '600' }}
                            >
                                Refresh Page
                            </Button>
                            <Button
                                onClick={() => window.location.href = '/'}
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
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;