import React, { useEffect } from 'react'
import { Container, Nav } from 'react-bootstrap'
import Logo from '../Images/smash-point-high-resolution-logo.png'

export default function Footer() {

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
        script.async = true;
        script.onload = () => {
            if (window.kofiwidget2) {
                window.kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'I3I81YL5SG');
                window.kofiwidget2.draw();
            }
        };
        document.body.appendChild(script);
        return () => document.body.removeChild(script);
    }, []);

    return (
        <footer className='bg-primary pt-32 pb-32 w-100 mt-auto'>
            <Container fluid className='px-4'>
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
                        style={{ width: '200px', maxWidth: '100%' }}
                    />

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

                {/* Ko-fi + copyright row */}
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.15)',
                    marginTop: '1.5rem',
                    paddingTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                }}>
                    <div style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.78rem',
                    }}>
                        © {new Date().getFullYear()} SmashPoint. All rights reserved.
                    </div>

                    {/* Ko-fi widget */}
                    <div id='kofi-widget-container' />
                </div>
            </Container>
        </footer>
    )
}