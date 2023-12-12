import React, {useState} from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container, Alert } from 'react-bootstrap'
import { NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState('')
    const navigate = useNavigate();

    const userLogin = async (e) => {
        e.preventDefault()
        try {
            const response = await fetch('http://localhost:5000/userlogin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const data = await response.json();
                if(data.success) {
                    localStorage.setItem('token', data.token)
                    navigate('/')
                    navigate(0)
                }
                else{
                    setErrorMessage('Invalid username or password')
                }
            } catch (err) {
            console.log(err.message)
        }
    };

    return (
        <Container>
            <div className='text-center h5 mt-120'>Sign In</div>
            <Container className='d-inline-flex justify-content-center'>
                <Form className='rounded bg-info p-80'>
                    {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
                    <Form.Group className='mb-3'>
                        <Form.Label>Email address</Form.Label>
                        <Form.Control 
                            type='email' 
                            placeholder='Enter email' 
                            value = {email}
                            onChange={e => setEmail(e.target.value)}
                        />
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
                    <div>
                        <NavLink to={`/forgotpassword`}>Forgot Password?</NavLink>
                        <Container className='mt-8'>
                            <NavLink onClick={userLogin}>                         
                                <Button variant='primary'>Log In</Button>
                            </NavLink>
                        </Container>
                        <div className='mt-32'>
                            <NavLink to={`/register`} className='mt-24'>Create Account</NavLink>
                        </div>
                    </div>
                </Form>
            </Container>
        </Container>
    )
}
export default SignIn