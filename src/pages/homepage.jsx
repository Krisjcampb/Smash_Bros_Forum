import React, { useState } from 'react'
import { Container } from 'react-bootstrap'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import ListContent from '../components/Search Bar/ListContent'
import axios from 'axios';

function Homepage() {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [file, setFile] = useState(null)
    const [show, setShow] = useState(false)
    const changeOpen = () => setShow(true)
    const changeClose = () => setShow(false)

    const handleFileChange = (event) => {
        setFile(event.target.files[0])
    }

    const onSubmitForm = async (e) => {
        e.preventDefault()
        const postdate = new Date()
        try {
            const body = { title, content, postdate }
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
                //handle success
                console.log(response);
            })
            .catch(function (response) {
                //handle error
                console.log(response);
            });
    }
    return (
      <>
        <div>Homepage</div>
        <Button onClick={changeOpen}>Add to the List</Button>
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
      </>
    )
    }
    export default Homepage
