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
        <p style={{ color: '#555', lineHeight: '1.75', margin: 0, paddingLeft: '2rem' }}>{children}</p>
    </div>
);

export default function Terms() {
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
                        Terms of Service
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
                        Please read these terms carefully before using SmashPoint
                    </p>
                </div>

                <div style={{
                    background: '#ffffff',
                    borderRadius: '0 0 16px 16px',
                    padding: '2.5rem 3rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}>
                    <div style={{ width: '40px', height: '4px', background: '#FFD443', borderRadius: '2px', marginBottom: '2rem' }} />

                    <Section number="1" title="Acceptance of Terms">
                        By creating an account or using this website, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the site.
                    </Section>

                    <Section number="2" title="Eligibility">
                        You must be at least 13 years old to use this website. By registering, you confirm that you meet this requirement.
                    </Section>

                    <Section number="3" title="Account Responsibility">
                        You are responsible for maintaining the confidentiality of your account credentials. You are also responsible for all activities that occur under your account.
                    </Section>

                    <Section number="4" title="Prohibited Conduct">
                        You agree not to engage in any conduct that is harmful, illegal, harassing, or disruptive. This includes spamming, impersonation, or violating any applicable laws.
                    </Section>

                    <Section number="5" title="Content Ownership">
                        You retain ownership of any content you post, but you grant us a license to use, display, and distribute it on our platform.
                    </Section>

                    <Section number="6" title="Termination">
                        We reserve the right to suspend or terminate your account at our discretion for violating these terms or for any other reason we deem necessary.
                    </Section>

                    <Section number="7" title="Modifications">
                        We may update these Terms of Service at any time. Changes will be effective upon posting. Continued use of the site indicates your acceptance of the updated terms.
                    </Section>

                    <Section number="8" title="Contact">
                        If you have any questions about these Terms, please contact us through the website's support system or reach out via the contact page.
                    </Section>

                    <div style={{
                        background: '#f5f5f3',
                        border: '1.5px solid #e0e0dc',
                        borderRadius: '10px',
                        padding: '1rem 1.5rem',
                        marginTop: '1rem',
                        fontSize: '0.82rem',
                        color: '#888',
                    }}>
                        Have a question about these terms?{' '}
                        <a href="/contact" style={{ color: '#393933', fontWeight: '700', textDecoration: 'none' }}>Contact us</a>
                    </div>
                </div>
            </div>
        </Container>
    )
}