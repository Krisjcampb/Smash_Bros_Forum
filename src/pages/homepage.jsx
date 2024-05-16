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
    const changeOpen = () => setShow(true)
    const changeClose = () => setShow(false)

    const handleFileChange = (event) => {
        setFile(event.target.files[0])
    }

    useEffect(() => {
        if(token) {
            fetch('http://localhost:5000/userauthenticate', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
            })
            .then(response => response.json())
            .then(data => setUsername(data.name))
        }   
    }, [token])

    const onSubmitForm = async (e) => {
        e.preventDefault()
        const postdate = new Date()
        try {
            const body = { title, content, username, postdate }
            const response = await fetch('http://localhost:5000/forumcontent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            })

        console.log(response)
        } catch (err) {
            console.log(err.message)
        }

        const formData = new FormData()
        formData.append('image', file)
        console.log(file)
        axios({
            method: 'POST',
            url: 'http://localhost:5000/forumimages',
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        })
            .then(function (response) {
                console.log(response);
            })
            .catch(function (response) {
                console.log(response);
            });
    }
    return (
        <Container>
            <Container className='d-flex flex-column'>
                <Row className='mt-24 ms-24 me-24 text-center'>
                    <Col>
                        {token ? (
                        <Button variant='secondary' onClick={changeOpen} className='w-25'>
                        Create A New Post
                        </Button>
                            ) :
                        (
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
                <Modal.Title>Creating a Thread</Modal.Title>
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
                    <Button type='sumbit' onClick={changeClose}>
                        Add to List
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
            <Container>
                <ListContent/>
            </Container>
        </Container>
    )
}

export default Homepage
