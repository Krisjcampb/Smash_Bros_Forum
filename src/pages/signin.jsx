import React, {useState, useEffect} from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container} from 'react-bootstrap'
import { NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import bcrypt from 'bcryptjs';

function BasicExample() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [userData, setUserData] = useState([]);
    const navigate = useNavigate();

    const findByEmail = (e, email) => {
        for (let o of e){
            if (o.email === email){
                return o
            }
        }
    }


    //Collects all forum user data
    const getUserDetails = async () => {
        try {
            const response = await fetch("http://localhost:5000/forumusers")
            const jsonData = await response.json();

        setUserData(jsonData);
        } catch (err){
            console.error(err.message)
        }
    };
    useEffect(() => {
        getUserDetails();
    }, []);

    const userLogin = (e) => {
        e.preventDefault();
        const usercheck = userData.find(user => (user.email) === email)
        if(usercheck === undefined){
            return console.log("Incorrect email or password")
        }
        bcrypt.compare(password, usercheck.password , function(err, isMatch){
            if(err){
                throw err;
            
            }else if(!isMatch){
                console.log("Incorrect email or password")
            }else{
                const result = Object.values(findByEmail(userData, email))
                localStorage.setItem('Username', result[1])
                localStorage.setItem('Email', result[2])
                localStorage.setItem('UserID', result[0])
                navigate('/')
                navigate(0)
            }
        })
    }

    return (
        <Container>
            <div className='text-center h5 mt-120'>Sign In</div>
            <Container className='d-inline-flex justify-content-center'>
                <Form className='rounded bg-info p-80'>
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
                        <NavLink to={`/forgotpassword`}>Forgot Password?</NavLink>
                    <Container>
                        <NavLink onClick={userLogin}>                         
                            <Button variant='primary'>Submit</Button>
                        </NavLink>
                    </Container>
                </Form>
            </Container>
        </Container>
    )
}

export default BasicExample
