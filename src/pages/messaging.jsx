// src/components/MessagingPage.js
import React, { useState } from 'react'
import {
  Container,
  Row,
  Col,
  ListGroup,
  Card,
  Form,
  Button,
} from 'react-bootstrap'

const Messaging = () => {
  const [selectedUser, setSelectedUser] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState([])

  const users = [
    { id: 1, name: 'User 1' },
    { id: 2, name: 'User 2' },
    { id: 3, name: 'User 3' },
    // Add more users as needed
  ]

  const handleUserSelection = (user) => {
    setSelectedUser(user)
  }

  const handleSendMessage = () => {
    if (selectedUser && messageInput.trim() !== '') {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'You', text: messageInput },
      ])
      setMessageInput('')
    }
  }

  return (
    <Container className='mt-5'>
      <Row>
        <Col sm={4}>
          <ListGroup>
            {users.map((user) => (
              <ListGroup.Item
                key={user.id}
                action
                active={user === selectedUser}
                onClick={() => handleUserSelection(user)}
              >
                {user.name}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
        <Col sm={8}>
          {selectedUser ? (
            <Card>
              <Card.Header>{selectedUser.name}</Card.Header>
              <Card.Body>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {messages.map((msg, index) => (
                    <p key={index}>
                      <strong>{msg.sender}:</strong> {msg.text}
                    </p>
                  ))}
                </div>
                <Form className='mt-3'>
                  <Form.Group controlId='messageInput'>
                    <Form.Control
                      type='text'
                      placeholder='Type your message...'
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                    />
                  </Form.Group>
                  <Button variant='primary' onClick={handleSendMessage}>
                    Send
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          ) : (
            <p className='text-center mt-5'>Select a user to start chatting</p>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default Messaging
