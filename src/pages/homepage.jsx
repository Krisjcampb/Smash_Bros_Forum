import React, { useState, useEffect } from 'react'
import { Container, Row, Col, InputGroup, Form } from 'react-bootstrap'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import { NavLink } from 'react-router-dom'
import { BsTextLeft, BsCardHeading, BsImageFill } from 'react-icons/bs'
import ListContent from '../components/Search Bar/ListContent'
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { API } from '../components/Utilities/apiUrl';

function Homepage() {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [file, setFile] = useState(null)
    const [show, setShow] = useState(false)
    const token = localStorage.getItem('token')
    const [username, setUsername] = useState('')
    const [usersId, setUsersId] = useState('')
    const [userRole, setUserRole] = useState('')
    const [isPosting, setIsPosting] = useState(false);

    const changeOpen = () => setShow(true)
    const changeClose = () => { setShow(false); setTitle(''); setContent(''); setFile(null); }

    const handleFileChange = (event) => {
        setFile(event.target.files[0])
    }

    useEffect(() => {
        if (token) {
            fetch(`${API}/userauthenticate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
            })
            .then(response => response.json())
            .then(data => {
                setUsername(data.name);
                setUsersId(data.id);
                setUserRole(data.role)
            })
            .catch(err => console.error('Error fetching user data:', err));
        }
    }, [token]);

    const onSubmitForm = async (e) => {
        e.preventDefault();

        if (isPosting) return;

        setIsPosting(true);

        try {
            const body = { title, content, username, usersId };

            const response = await fetch(`${API}/forumcontent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error('Failed to create forum content');
            }

            const createdThread = await response.json();
            const { thread_id } = createdThread;

            let filepath = null;

            if (file) {
                const compressionOptions = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                };

                const compressedFile = await imageCompression(file, compressionOptions);

                const formData = new FormData();
                formData.append('image', compressedFile);
                formData.append('thread_id', thread_id);

                const imageUploadResponse = await axios({
                    method: 'POST',
                    url: `${API}/forumimages`,
                    data: formData,
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                if (imageUploadResponse.status !== 200) {
                    throw new Error('Failed to upload image');
                }

                filepath = imageUploadResponse.data.filepath;
            }
            changeClose();

        } catch (err) {
            console.log('Error:', err.message);
        } finally {
            setIsPosting(false);
        }
    };

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
        <Container fluid className='hello'>
            <Container className="create-post-container d-flex flex-column">
                <Row className='mt-24 text-center'>
                    <Col>
                        {token ? (
                            <Button
                                onClick={changeOpen}
                                style={{
                                    background: '#393933',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '0.6rem 2rem',
                                    fontWeight: '700',
                                    color: '#FFD443',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.target.style.background = '#FFD443'; e.target.style.color = '#393933'; }}
                                onMouseLeave={e => { e.target.style.background = '#393933'; e.target.style.color = '#FFD443'; }}
                            >
                                Create A New Post
                            </Button>
                        ) : (
                            <NavLink to='/signin'>
                                <Button variant='secondary' style={{ borderRadius: '10px', padding: '0.6rem 2rem', fontWeight: '600' }}>
                                    Sign In to Create a Post
                                </Button>
                            </NavLink>
                        )}
                    </Col>
                </Row>
            </Container>

            <Modal show={show} onHide={changeClose} centered>
                <div style={{
                    background: '#393933',
                    borderRadius: '8px 8px 0 0',
                    padding: '1.5rem 2rem 1.25rem',
                    borderBottom: '4px solid #FFD443',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{
                            display: 'inline-block',
                            background: '#FFD443',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#393933',
                            marginBottom: '0.5rem',
                        }}>
                            New Thread
                        </div>
                        <h5 style={{ color: '#ffffff', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
                            Create a Post
                        </h5>
                    </div>
                    <button
                        onClick={changeClose}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>

                <Form onSubmit={onSubmitForm}>
                    <Modal.Body style={{ padding: '1.5rem 2rem' }}>
                        <Form.Group className="mb-3">
                            <Form.Label style={labelStyle}>Title</Form.Label>
                            <InputGroup>
                                <InputGroup.Text style={iconGroupStyle}><BsCardHeading size={14} /></InputGroup.Text>
                                <Form.Control
                                    type='text'
                                    value={title}
                                    placeholder='Give your thread a title'
                                    maxLength={69}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    style={inputStyle}
                                />
                            </InputGroup>
                            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: title.length >= 55 ? '#e39647' : '#bbb', marginTop: '0.25rem' }}>
                                {title.length}/69
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label style={labelStyle}>Content</Form.Label>
                            <InputGroup style={{ alignItems: 'flex-start' }}>
                                <InputGroup.Text style={{ ...iconGroupStyle, paddingTop: '0.65rem' }}><BsTextLeft size={14} /></InputGroup.Text>
                                <Form.Control
                                    as='textarea'
                                    rows={4}
                                    value={content}
                                    placeholder='What do you want to share?'
                                    onChange={(e) => setContent(e.target.value)}
                                    style={{ ...inputStyle, resize: 'none' }}
                                />
                            </InputGroup>
                        </Form.Group>

                        <Form.Group>
                            <Form.Label style={labelStyle}>
                                Image{' '}
                                <span style={{ fontWeight: '400', color: '#aaa', fontSize: '0.8rem' }}>(optional)</span>
                            </Form.Label>
                            <InputGroup>
                                <InputGroup.Text style={iconGroupStyle}><BsImageFill size={14} /></InputGroup.Text>
                                <Form.Control
                                    type='file'
                                    accept='image/*'
                                    onChange={handleFileChange}
                                    style={{ ...inputStyle, paddingTop: '0.45rem' }}
                                />
                            </InputGroup>
                        </Form.Group>
                    </Modal.Body>

                    <Modal.Footer style={{ borderTop: '1px solid #e0e0dc', padding: '1rem 2rem' }}>
                        <Button
                            variant='outline-secondary'
                            onClick={changeClose}
                            style={{ borderRadius: '8px', fontWeight: '600' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            disabled={isPosting}
                            style={{
                                background: '#393933',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                color: '#FFD443',
                                padding: '0.5rem 1.5rem',
                                opacity: isPosting ? 0.7 : 1,
                            }}
                        >
                            {isPosting ? 'Posting...' : 'Post Thread'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <ListContent userRole={userRole} usersId={usersId} />
        </Container>
    )
}

export default Homepage