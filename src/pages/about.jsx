import React from 'react'
import { Container } from 'react-bootstrap'

function About() {
    return (
        <Container>
            <div style={{
                maxWidth: '720px',
                margin: '4rem auto',
                padding: '0 1rem',
            }}>
                {/* Header card */}
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
                        Our Story
                    </div>
                    <h1 style={{
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '2.25rem',
                        margin: 0,
                        letterSpacing: '-0.02em',
                    }}>
                        About SmashPoint
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.9rem',
                        marginTop: '0.5rem',
                        marginBottom: 0,
                    }}>
                        A hub for the Smash Bros. community
                    </p>
                </div>

                {/* Content body */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '0 0 16px 16px',
                    padding: '2.5rem 3rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}>
                    <div style={{
                        width: '40px',
                        height: '4px',
                        background: '#FFD443',
                        borderRadius: '2px',
                        marginBottom: '1.5rem',
                    }} />

                    <p style={{ color: '#444', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                        Welcome to SmashPoint. Here, we aim to create a central
                        site for people in the smash scene to keep in touch with the
                        latest updates on events, players, and other important developments in
                        the community. We do this as an alternative to other sites to foster
                        a close-knit community that stretches across the world.
                    </p>

                    <p style={{ color: '#444', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                        The Smash Bros. scene is a special scene to many, with so much to do and see,
                        especially in regards to playing smash. From Smash 64 to Ultimate and
                        everything in between, there is something so special with every person
                        that chooses to compete, hang out, or even just watch online. Everyone
                        that has been a part of that has made an impact on someone somehow in
                        the scene, and we want to give back to all those people that have made
                        us grow as a community.
                    </p>

                    <p style={{ color: '#444', lineHeight: '1.8', marginBottom: '2rem' }}>
                        As such, this website was born. We want to give everyone an even bigger
                        opportunity to grow the scene through any means they can, and what better
                        way than a streamlined place to interact with the people that play one of
                        our favorite games and push the competitive boundaries of the game we love.
                    </p>

                    {/* Call to action strip */}
                    <div style={{
                        background: '#f5f5f3',
                        border: '1.5px solid #e0e0dc',
                        borderRadius: '10px',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                    }}>
                        <div>
                            <div style={{ fontWeight: '700', color: '#393933', fontSize: '0.9rem' }}>
                                Enjoying SmashPoint?
                            </div>
                            <div style={{ color: '#888', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                                Follow @SmashPoint on Twitter and share the site with your crew
                            </div>
                        </div>
                        <a
                            href="/feedback"
                            style={{
                                background: '#393933',
                                color: '#FFD443',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.5rem 1.25rem',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Give Feedback
                        </a>
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default About