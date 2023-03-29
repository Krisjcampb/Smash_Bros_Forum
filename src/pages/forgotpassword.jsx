import React, {useState} from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container} from 'react-bootstrap'

function ForgotPassword() {

    const [email, setEmail] = useState("");
    const [text, setText] = useState("Enter the email registered to your account.")
    const [validated, setValidated] = useState(false)
    const re =
       /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    const handleSubmit = async (e) => {
        e.preventDefault()
        if(re.test(email)){
            setText('Your verification code has been sent to ' + email + ". Please enter the code below")
        }
        setValidated(true)
    }

    return (
      <Container>
        <div className='text-primary'>Reset Password</div>
        <div>{text}</div>
        <Form
          noValidate
          validated={validated}
          className='rounded bg-secondary p-40'
          onSubmit={handleSubmit}
        >
            <Form.Group className='mb-1'>
                <Form.Label>Email address</Form.Label>
                <Form.Control
                    type='email'
                    placeholder='Enter email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Form.Control.Feedback type='invalid'>
                    Please input a valid email.
                </Form.Control.Feedback>
            </Form.Group>
            <Button variant='primary' type='submit'>Submit</Button>
        </Form>
      </Container>
    )
}

export default ForgotPassword
