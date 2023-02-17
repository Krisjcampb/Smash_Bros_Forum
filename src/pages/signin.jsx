import React, {useState, useEffect} from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container} from 'react-bootstrap'
import { NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

function BasicExample() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [userData, setUserData] = useState([]);
    const navigate = useNavigate();

    const findByPass = (e, password) => {
        for (let o of e){
            if (o.password === password){
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
        const usercheck = userData.find(user => (user.email) === email && user.password === password);
        if(usercheck){
            const result = Object.values(findByPass(userData, password))
            console.log("Login successful");
            console.log(result)
            localStorage.setItem("Username", result[1])
            localStorage.setItem('Email', result[2])
            localStorage.setItem('UserID', result[0])
            navigate('/')
            navigate(0)
        }
        else{
            console.log("Wrong email or password");
        }
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
                    <NavLink onClick={userLogin}>                         
                            <Button variant='primary'>Submit</Button>
                    </NavLink>
                </Form>
            </Container>
        </Container>
    )
}

export default BasicExample
