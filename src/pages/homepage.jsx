import React, { useState, useEffect } from 'react'
import { Container, InputGroup, Form } from 'react-bootstrap'
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
    const [newThread, setNewThread] = useState(null);

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
            const body = {
                title,
                content,
                username,
                usersId
            };

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

            if (file) {
                const compressionOptions = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                };

                const compressedFile = await imageCompression(
                    file,
                    compressionOptions
                );

                const formData = new FormData();

                formData.append('image', compressedFile);
                formData.append('thread_id', thread_id);

                const imageUploadResponse = await axios({
                    method: 'POST',
                    url: `${API}/forumimages`,
                    data: formData,
                    headers: {
                        Authorization: 'Bearer ' + token
                    },
                });

                if (imageUploadResponse.status !== 200) {
                    throw new Error('Failed to upload image');
                }
            }

            const updatedThreadResponse = await fetch(
                `${API}/forumcontent/${thread_id}`
            );

            if (!updatedThreadResponse.ok) {
                throw new Error('Failed to fetch updated thread');
            }

            const updatedThread = await updatedThreadResponse.json();
            setNewThread(updatedThread);

            changeClose();

        } catch (err) {
            console.log('Error:', err.message);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <Container fluid className="homepage-shell">
            <Container className="homepage-intro">
                <div className="homepage-intro__copy">
                    <span className="eyebrow-badge">Forum Hub</span>
                    <h1>SmashPoint</h1>
                    <p>Find match discussion, tournament updates, matchup advice, and smash related threads in one place.</p>
                </div>

                <div className="homepage-intro__actions">
                    {token ? (
                        <Button onClick={changeOpen} className="primary-btn create-thread-btn">
                            Create New Post
                        </Button>
                    ) : (
                        <NavLink to="/signin" className="nav-link p-0">
                            <Button className="secondary-btn sign-in-thread-btn">
                                Sign In to Post
                            </Button>
                        </NavLink>
                    )}
                </div>
            </Container>

            <Modal show={show} onHide={changeClose} centered className="thread-modal">
                <div className="thread-modal__header">
                    <div>
                        <div className="eyebrow-badge">New Thread</div>
                        <h5>Create a Post</h5>
                    </div>
                    <button
                        type="button"
                        aria-label="Close modal"
                        onClick={changeClose}
                        className="thread-modal__close"
                    >
                        x
                    </button>
                </div>

                <Form onSubmit={onSubmitForm}>
                    <Modal.Body className="thread-modal__body">
                        <Form.Group className="thread-form-field mb-3">
                            <Form.Label className="thread-form-label">Title</Form.Label>
                            <InputGroup className="thread-input-group">
                                <InputGroup.Text><BsCardHeading size={14} /></InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    value={title}
                                    placeholder="Give your thread a title"
                                    maxLength={69}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </InputGroup>
                            <div className={`thread-character-count ${title.length >= 55 ? 'is-warning' : ''}`}>
                                {title.length}/69
                            </div>
                        </Form.Group>

                        <Form.Group className="thread-form-field mb-3">
                            <Form.Label className="thread-form-label">Content</Form.Label>
                            <InputGroup className="thread-input-group align-items-start">
                                <InputGroup.Text className="thread-input-group__textarea-icon"><BsTextLeft size={14} /></InputGroup.Text>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    value={content}
                                    placeholder="What do you want to share?"
                                    onChange={(e) => setContent(e.target.value)}
                                    className="thread-form-textarea"
                                />
                            </InputGroup>
                        </Form.Group>

                        <Form.Group className="thread-form-field">
                            <Form.Label className="thread-form-label">
                                Image <span>(optional)</span>
                            </Form.Label>
                            <InputGroup className="thread-input-group">
                                <InputGroup.Text><BsImageFill size={14} /></InputGroup.Text>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </InputGroup>
                        </Form.Group>
                    </Modal.Body>

                    <Modal.Footer className="thread-modal__footer">
                        <Button
                            type="button"
                            variant="outline-secondary"
                            onClick={changeClose}
                            className="thread-modal__secondary"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPosting}
                            className="primary-btn thread-modal__submit"
                        >
                            {isPosting ? 'Posting...' : 'Post Thread'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <ListContent userRole={userRole} usersId={usersId} newThread={newThread}/>
        </Container>
    )
}

export default Homepage
