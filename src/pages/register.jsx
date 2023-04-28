import React, { useState, useEffect } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container, Alert } from 'react-bootstrap'
import bcrypt from 'bcryptjs'

function BasicExample() {
    const [email, setEmail] = useState('')
    const [username, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmpass, setConfirmPass] = useState('')
    const [validated, setValidated] = useState(false);
    const [userData, setUserData] = useState([])
    const [emailError, setEmailError] = useState('')
    const [showError, setShowError] = useState(false);

    const getUserDetails = async () => {
      try {
        const response = await fetch('http://localhost:5000/forumusers')
        const jsonData = await response.json()

        setUserData(jsonData)
      } catch (err) {
        console.error(err.message)
      }
    }
    useEffect(() => {
      getUserDetails()
    }, [])

    useEffect(() => {
        let timer;
        if (email !== ''){
            timer = setTimeout(() => {
                const usercheck = userData.find((user) => user.email === email)
                if (usercheck) {
                  setEmailError('Email is already taken')
                  setShowError(true)
                } else {
                  setEmailError('')
                  setShowError(false)
                }       
            }, 500)   ;  
        } else{
            setEmailError('')
            setShowError(false);
        }
        return () => clearTimeout(timer)
    }, [email, userData])
    
    const onSubmitForm = async (e) => {
        e.preventDefault()
        if (password === confirmpass && !!password) {
            try {
            const hashedpassword = bcrypt.hashSync(password, 10)
            const body = { email, username, hashedpassword }
            const response = await fetch(
                'http://localhost:5000/forumusers',
                {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                }
            )
            console.log(body)
            console.log(response)
            } catch (err) {
            console.log(err.message)
            }
        } else {
            console.log('error')
            setValidated(true)
        }
    }
    return (
      <Container>
        <div className='text-center h5 mt-96'>Create Your Account</div>
        <Container className='d-inline-flex justify-content-center'>
          <Form
            noValidate
            validated={validated}
            className='rounded bg-info p-80'
            onSubmit={onSubmitForm}
          >
            <Form.Group className='mb-3'>
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type='email'
                placeholder='Enter email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {showError && <Alert variant="danger" className="p-4 m-4">{emailError}</Alert>}
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Username</Form.Label>
              <Form.Control
                type='text'
                placeholder='Enter username'
                value={username}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
              <Form.Text className='text-muted'>
                This will be your display name.
              </Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Password</Form.Label>
              <Form.Control
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type='password'
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
              <Form.Control.Feedback type='invalid'>
                Please make sure passwords are matching.
              </Form.Control.Feedback>
            </Form.Group>

            <Button variant='primary' type='submit' className='mt-24'>
              Submit
            </Button>
          </Form>
        </Container>
      </Container>
    )
}

export default BasicExample
