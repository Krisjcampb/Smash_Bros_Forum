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
                const html = window.kofiwidget2.getHTML();
                const container = document.getElementById('kofi-widget-container');
                if (container && html) {
                    container.innerHTML = html;
                }
            }
        };
        document.body.appendChild(script);
        return () => document.body.removeChild(script);
    }, []);

    return (
        <footer className="site-footer">
            <Container fluid className="site-footer__inner">
                <div className="site-footer__top">
                    <div className="site-footer__brand">
                        <img src={Logo} alt="Smash Point" className="site-footer__logo" />
                        <span className="site-footer__tagline">Community, brackets, and conversation.</span>
                    </div>

                    <Nav className="site-footer__links">
                        <Nav.Link href="/">Home</Nav.Link>
                        <Nav.Link href="/userlist">User List</Nav.Link>
                        <Nav.Link href="/about">About Us</Nav.Link>
                        <Nav.Link href="/contact">Contact Us</Nav.Link>
                    </Nav>

                    <Nav className="site-footer__legal">
                        <Nav.Link href="/terms">Terms of Service</Nav.Link>
                        <Nav.Link href="/privacy">Privacy Policy</Nav.Link>
                    </Nav>
                </div>

                <div className="site-footer__bottom">
                    <div className="site-footer__copyright">
                        &copy; {new Date().getFullYear()} SmashPoint. All rights reserved.
                    </div>
                    <a
                        href="https://ko-fi.com/I3I81YL5SG"
                        target="_blank"
                        rel="noreferrer"
                        className="site-footer__support"
                    >
                        <img
                            src="https://storage.ko-fi.com/cdn/kofi2.png?v=3"
                            alt="Buy Me a Coffee at ko-fi.com"
                        />
                    </a>
                </div>
            </Container>
        </footer>
    )
}
