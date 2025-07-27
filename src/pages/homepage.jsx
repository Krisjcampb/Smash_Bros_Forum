import React, { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import { NavLink } from 'react-router-dom'
import ListContent from '../components/Search Bar/ListContent'
import axios from 'axios';

function Homepage() {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [file, setFile] = useState(null)
    const [show, setShow] = useState(false)
    const token = localStorage.getItem('token')
    const [username, setUsername] = useState('')
    const [usersId, setUsersId] = useState('')
    const [userRole, setUserRole] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)

    const changeOpen = () => setShow(true)
    const changeClose = () => setShow(false)

    const handleFileChange = (event) => {
        setFile(event.target.files[0])
    }

    useEffect(() => {
        if (token) {
            fetch('http://localhost:5000/userauthenticate', {
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

        const postdate = new Date().toLocaleString();

        try {
            const body = { title, content, username, postdate, usersId };
            const response = await fetch('http://localhost:5000/forumcontent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error('Failed to create forum content');
            }

            const newThread = await response.json();
            const { thread_id } = newThread;

            setRefreshKey(prevKey => prevKey + 1);

            if (file) {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('thread_id', thread_id);
                
                const imageUploadResponse = await axios({
                    method: 'POST',
                    url: 'http://localhost:5000/forumimages',
                    data: formData,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                if (imageUploadResponse.status === 200) {
                    console.log('Image uploaded successfully', imageUploadResponse);
                } else {
                    throw new Error('Failed to upload image');
                }
            }
        } catch (err) {
            console.log('Error:', err.message);
        }
    };

    return (
        <Container className='content-container'>
            <Container className='d-flex flex-column'>
                <Row className='mt-24 ms-24 me-24 text-center'>
                    <Col>
                        {token ? (
                            <Button variant='secondary' onClick={changeOpen} className='w-25'>
                                Create A New Post
                            </Button>
                        ) : (
                            <NavLink to='/signin'>
                                <Button variant='secondary' className='w-25'>
                                    Sign In to Create a Post
                                </Button>
                            </NavLink>
                        )}
                    </Col>
                </Row>
            </Container>
            <Modal show={show} onHide={changeClose}>
                <Modal.Header closeButton>
                    <div className='w-100 text-center'>
                        <Modal.Title className='text-dark' text-center>Creating a Thread</Modal.Title>
                    </div>
                </Modal.Header>
                <Form onSubmit={onSubmitForm}>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label>Title</Form.Label>
                            <br />
                            <Form.Control
                                type='text'
                                value={title}
                                placeholder='Title'
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <Form.Label>Thread Content</Form.Label>
                            <br />
                            <Form.Control
                                type='text'
                                value={content}
                                placeholder='Content'
                                onChange={(e) => setContent(e.target.value)}
                            />
                            <Form.Label>File Upload</Form.Label>
                            <br />
                            <Form.Control
                                type='file'
                                placeholder='Image'
                                onChange={handleFileChange}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type='submit' onClick={changeClose}>
                            Add to List
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <Container>
                <ListContent key={refreshKey} userRole={userRole} usersId={usersId}/>
            </Container>
        </Container>
    )
}

export default Homepage