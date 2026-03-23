import React from 'react'
import { Container } from 'react-bootstrap'

const Section = ({ number, title, children }) => (
    <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{
                background: '#FFD443',
                color: '#393933',
                fontWeight: '800',
                fontSize: '0.75rem',
                borderRadius: '4px',
                padding: '2px 7px',
                flexShrink: 0,
            }}>
                {number}
            </span>
            <h5 style={{ fontWeight: '700', color: '#393933', margin: 0 }}>{title}</h5>
        </div>
        <div style={{ color: '#555', lineHeight: '1.75', paddingLeft: '2rem' }}>{children}</div>
    </div>
);

export default function Privacy() {
    return (
        <Container>
            <div style={{ maxWidth: '760px', margin: '4rem auto', padding: '0 1rem' }}>

                <div style={{
                    background: '#393933',
                    borderRadius: '16px 16px 0 0',
                    padding: '2.5rem 3rem 2rem',
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
                        Legal
                    </div>
                    <h1 style={{ color: '#ffffff', fontWeight: '800', fontSize: '2.25rem', margin: 0, letterSpacing: '-0.02em' }}>
                        Privacy Policy
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
                        How we collect, use, and protect your information
                    </p>
                </div>

                <div style={{
                    background: '#ffffff',
                    borderRadius: '0 0 16px 16px',
                    padding: '2.5rem 3rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}>
                    <div style={{ width: '40px', height: '4px', background: '#FFD443', borderRadius: '2px', marginBottom: '2rem' }} />

                    <Section number="1" title="Information We Collect">
                        <p style={{ marginBottom: '0.75rem' }}>We collect information you provide directly, including your username, email address, password, selected avatar, posts, comments, messages, and likes.</p>
                        <p style={{ margin: 0 }}>We also collect certain information automatically such as your IP address, browser type, device information, pages visited, and timestamps. We use cookies and similar technologies to improve your experience and remember your preferences.</p>
                    </Section>

                    <Section number="2" title="How We Use Your Information">
                        <p style={{ margin: 0 }}>We use your information to create and manage your account, enable site features like posts and direct messages, improve and personalize your experience, monitor activity to maintain a safe community, send relevant notifications, and respond to support requests.</p>
                    </Section>

                    <Section number="3" title="Sharing Your Information">
                        <p style={{ margin: 0 }}>We do not sell your data. We may share it with trusted service providers such as email and hosting services, if required by law or legal request, or in the event of a business transfer such as a merger or sale of assets.</p>
                    </Section>

                    <Section number="4" title="Your Rights and Choices">
                        <p style={{ margin: 0 }}>You may view or update your profile information at any time, delete your account, opt out of optional notifications, and request a copy of your personal data where required by law.</p>
                    </Section>

                    <Section number="5" title="Data Security">
                        <p style={{ margin: 0 }}>We use industry-standard security measures including encryption, hashed passwords, and HTTPS to protect your data. Your direct messages are end-to-end encrypted and cannot be read by us. However no system is completely secure so please use strong passwords and keep your credentials safe.</p>
                    </Section>

                    <Section number="6" title="Third-Party Links">
                        <p style={{ margin: 0 }}>The site may contain links to external websites we do not control. We are not responsible for their privacy practices and encourage you to review their policies.</p>
                    </Section>

                    <Section number="7" title="Children's Privacy">
                        <p style={{ margin: 0 }}>Our site is not intended for users under the age of 13. We do not knowingly collect personal information from children.</p>
                    </Section>

                    <Section number="8" title="Changes to This Policy">
                        <p style={{ margin: 0 }}>We may update this policy periodically. If we make significant changes we will notify you through the website or via email.</p>
                    </Section>

                    <Section number="9" title="Contact Us">
                        <p style={{ margin: 0 }}>If you have any questions or requests regarding your privacy please reach out through our contact page.</p>
                    </Section>

                    <div style={{
                        background: '#f5f5f3',
                        border: '1.5px solid #e0e0dc',
                        borderRadius: '10px',
                        padding: '1rem 1.5rem',
                        marginTop: '0.5rem',
                        fontSize: '0.82rem',
                        color: '#888',
                    }}>
                        Have a privacy concern?{' '}
                        <a href="/contact" style={{ color: '#393933', fontWeight: '700', textDecoration: 'none' }}>Contact us</a>
                    </div>
                </div>
            </div>
        </Container>
    )
}