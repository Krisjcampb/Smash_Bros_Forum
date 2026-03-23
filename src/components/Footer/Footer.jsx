import React from 'react'
import { Container, Nav } from 'react-bootstrap'
import Logo from '../Images/smash-point-high-resolution-logo.png'

export default function Footer() {
    return (
        <footer className='bg-primary pt-32 pb-32 w-100 mt-auto'>
            <Container fluid className='px-4'>
                {/* Flex row on desktop stacks to column on mobile */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                }}>
                    <img
                        src={Logo}
                        alt='Logo'
                        style={{
                            width: '200px',
                            maxWidth: '100%',
                        }}
                    />
                    {/* Nav links wrap naturally on smaller screens */}
                    <Nav style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.25rem 1rem',
                        justifyContent: 'center',
                    }}>
                        <Nav.Link href='/userlist'>User List</Nav.Link>
                        <Nav.Link href='/contact'>Contact Us</Nav.Link>
                        <Nav.Link href='/about'>About Us</Nav.Link>
                        <Nav.Link href='/'>Home</Nav.Link>
                    </Nav>

                    <div className='d-flex flex-column gap-2 me-8'>
                        <Nav.Link href='/terms'>Terms of Service</Nav.Link>
                        <Nav.Link href='/privacy'>Privacy Policy</Nav.Link>
                    </div>
                </div>

                {/* Copyright line below on all screen sizes */}
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.15)',
                    marginTop: '1.5rem',
                    paddingTop: '1rem',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.78rem',
                }}>
                    © {new Date().getFullYear()} SmashPoint. All rights reserved.
                </div>
            </Container>
        </footer>
    )
}