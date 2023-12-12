import React from 'react'
import { useLocation } from 'react-router-dom'
import { Container, Row } from 'react-bootstrap'
import { Form } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import Button from 'react-bootstrap/Button'
import UserComments from '../components/User Comments/UserComments'


function Threads() {
    const [comment, setComment] = useState("")
    const location = useLocation()
    const [user, setUser] = useState("")
    const thread_id = location.state.thread_id

    const onSubmitForm = async (e) => {
        e.preventDefault()
        try {
            const timeposted = new Date()
            console.log(timeposted)
            const body = { thread_id, comment, user, timeposted }
            const response = await fetch('http://localhost:5000/forumcomments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            })
        console.log(response)
        } catch (err) {
            console.log(err.message)
        }
    }
    useEffect(() => {
      const token = localStorage.getItem('token')
      if (token) {
        fetch('http://localhost:5000/userauthenticate', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
        })
          .then((response) => response.json())
          .then((data) => setUser(data))
      }
    }, [])
    return (
        <Container>
            <div className='h4 text-center mb-32 mt-24'>{location.state.title}</div>
            <Row>
                <div className='text-right pb-64'>
                    {location.state.content}
                </div>
            </Row>
            <Row>
                <Form title={user}>
                    <Form.Group className="mb-3" controlId="exampleForm.ControlTeyxtarea1">
                        <Form.Label>Comment</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={5} 
                            type='text' 
                            placeholder='Comment Here'
                            value = {comment}
                            onChange={e => setComment(e.target.value)}
                        />
                        <Button type='sumbit' onClick={onSubmitForm}>Post</Button>
                    </Form.Group>
                </Form>
            </Row>
            <Container>
                <UserComments />
            </Container>
        </Container>

    );
}

export default Threads;
