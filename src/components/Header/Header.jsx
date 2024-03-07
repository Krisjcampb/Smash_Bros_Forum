import React, {useState, useEffect} from 'react'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import Logo from '../Images/pnw-smash-hub-high-resolution-color-logo.png'
import { NavDropdown } from 'react-bootstrap'

const Logout = () => {
  localStorage.clear()
  window.location.reload(false)
}

function Header(){
    const [user, setUser] = useState("")
    const [userid, setUserId] = useState("")
    const [loginstate, setLoginState] = useState(false)
    const userprofile = `/userprofile/${user}/${userid}`;
    const directmessage = `/messaging/${user}/${userid}`;
    useEffect(() => {
        const token = localStorage.getItem('token');
        if(token) {
            fetch('http://localhost:5000/userauthenticate', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
            })
            .then(response => response.json())
            .then(data => {
                const { id, name } = data;
                setUser(name);
                setUserId(id)
            })
            .then(setLoginState(true))
        }
    }, [user])

    return (
      <>
        <Navbar bg='primary' variant='dark'>
          <img
            className='img-fluid'
            style={{ width: 150 }}
            alt='Logo'
            src={Logo}
          />
          <Navbar.Brand href='/'>Navbar</Navbar.Brand>
          <Nav className='container-fluid'>
            <Nav.Item>
              <Nav.Link href='/'>Home</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link href='/resetpassword'>Features</Nav.Link>
            </Nav.Item>
            <Nav.Item className='ms-auto'>
              {loginstate === false && (
                <Nav.Link href='/signin'>Sign In</Nav.Link>
              )}
              {loginstate === true && (
                <NavDropdown title={user} align='end'>
                  <NavDropdown.Item href={userprofile}>Profile</NavDropdown.Item>
                  <NavDropdown.Item href={directmessage}>Direct Messages</NavDropdown.Item>
                  <NavDropdown.Item onClick={Logout}>Log Out</NavDropdown.Item>
                </NavDropdown>
              )}
            </Nav.Item>
          </Nav>
        </Navbar>
      </>
    )
}

export default Header
