import React, { useState } from 'react'
import { Container } from 'react-bootstrap'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import ListContent from '../components/Search Bar/ListContent'
function Homepage() {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [img, setImg] = useState('')
    const [show, setShow] = useState(false)
    const changeOpen = () => setShow(true)
    const changeClose = () => setShow(false)

    const onSubmitForm = async (e) => {
        e.preventDefault()
        try {
            const body = { title, content, img }
            const response = await fetch('http://localhost:5000/forumcontent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            })

        console.log(response)
        } catch (err) {
            console.log(err.message)
        }
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
                  value={img}
                  placeholder='Image'
                  onChange={(e) => setImg(e.target.value)}
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
            <ListContent />
        </Container>
      </>
    )
    }
    export default Homepage
