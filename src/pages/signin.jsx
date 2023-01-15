import React, {useState} from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container} from 'react-bootstrap'

function BasicExample() {
    const [description, setDescription] = useState("")
    const [password, setPassword] = useState("")

    const onSubmitForm = async e => {
        e.preventDefault();
        try {
            const body = {description, password};
            const response = await fetch("http://localhost:5000/todos", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(body)
            });

            console.log(response);
        } catch (err){
            console.log(err.message)
        }
    };
    return (
        <Container>
            <div className='text-center h5 mt-120'>Sign In</div>
            <Container className='d-inline-flex justify-content-center'>
                <Form className='rounded bg-info p-80' onSubmit={onSubmitForm}>
                    <Form.Group className='mb-3'>
                        <Form.Label>Email address</Form.Label>
                        <Form.Control 
                            type='email' 
                            placeholder='Enter email' 
                            value = {description}
                            onChange={e => setDescription(e.target.value)}
                        />
                        {/* <Form.Control.Feedback type='invalid'>
                            {errors.formBasicEmail}
                        </Form.Control.Feedback> */}
                        <Form.Text className='text-muted'>
                        We'll never share your email with anyone else.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className='mb-3'>
                        <Form.Label>Password</Form.Label>
                        <Form.Control 
                            type='password' 
                            placeholder='Password'
                            value = {password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </Form.Group>

                    <Button variant='primary' type='submit'>
                        Submit
                    </Button>
                </Form>
            </Container>
        </Container>
    )
}

export default BasicExample
