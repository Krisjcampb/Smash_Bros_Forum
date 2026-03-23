import React from 'react'
import { Container } from 'react-bootstrap'
import ListUsers from '../components/Search Bar/ListUsers'

function UserList() {
    return (
        <Container>
            <div style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1rem' }}>

                {/* Header band matching the rest of the site */}
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
                        Community
                    </div>
                    <h2 style={{
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '1.75rem',
                        margin: 0,
                        letterSpacing: '-0.02em',
                    }}>
                        User List
                    </h2>
                    <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.875rem',
                        marginTop: '0.4rem',
                        marginBottom: 0,
                    }}>
                        Browse and connect with SmashPoint members
                    </p>
                </div>

                {/* Content body */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '0 0 16px 16px',
                    padding: '2rem 2.5rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}>
                    <ListUsers />
                </div>

            </div>
        </Container>
    )
}

export default UserList