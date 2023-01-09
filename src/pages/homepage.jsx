import { Container, Row, Col } from 'react-bootstrap'
import React, { useState, useRef } from 'react'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Card from 'react-bootstrap/Card'
import Footer from '../components/Footer/Footer'

function Homepage() {
  const [newTitle, setNewTitle] = useState([])
  const [newDescription, setNewDescription] = useState([])
  const [newImage, setNewImage] = useState([])
  const [show, setShow] = useState(false)
  const title = useRef()
  const description = useRef()
  const image = useRef()
  const changeOpen = () => setShow(true)
  const changeClose = () => setShow(false)

  var addToList = (e) => {
    e.preventDefault()
    setNewTitle([...newTitle, title.current.value])
    setNewDescription([...newDescription, description.current.value])
    setNewImage([...newImage, image.current.value])
  }

  return (
    <>
      <div>Homepage</div>
      <Button onClick={changeOpen}>Add to the List</Button>
      <Modal show={show} onHide={changeClose}>
        <Modal.Header closeButton>
          <Modal.Title>Creating a Thread</Modal.Title>
        </Modal.Header>
        <form onSubmit={addToList}>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Title</Form.Label>
              <br />
              <Form.Control type='text' ref={title} placeholder='Title' />
              <Form.Label>Thread Content</Form.Label>
              <br />
              <Form.Control
                type='text'
                ref={description}
                placeholder='Content'
              />
              <Form.Label>File Upload</Form.Label>
              <br />
              <Form.Control type='file' ref={image} placeholder='Image' />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type='sumbit' onClick={changeClose}>
              Add to List
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <div
        style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}
      >
        {newTitle.map((item, index) => (
          <Card style={{ width: '15rem' }}>
            <Card.Img variant='top' src='images/004.jpg' />
            <Card.Body>
              <Card.Title>{item}</Card.Title>
              <Card.Text>{newDescription[index]}</Card.Text>
              <Button variant='primary'>Go somewhere</Button>
            </Card.Body>
          </Card>
        ))}
      </div>
    </>
  )
}
export default Homepage
