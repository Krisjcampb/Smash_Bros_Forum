import React from 'react'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import Logo from '../Images/pnw-smash-hub-high-resolution-color-logo.png'
import { NavDropdown } from 'react-bootstrap'

const Logout = () => {
    localStorage.clear()
    window.location.reload(false)
}

const Header = (props) => {
  	return (
        <>
            <Navbar bg='primary' variant='dark'>
                    <img
                    className ='img-fluid'
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
                        <Nav.Item>
                            <Nav.Link href='#pricing'>Pricing</Nav.Link>
                        </Nav.Item>
                        <Nav.Item className='ms-auto'>
                            <NavDropdown
                                title={localStorage.getItem("Username")}
                            >
                                <NavDropdown.Item href='/'>Profile</NavDropdown.Item>
                                <NavDropdown.Item href='/'>User Settings</NavDropdown.Item>
                                <NavDropdown.Item onClick={Logout}>Log Out</NavDropdown.Item>
                            </NavDropdown>
                        </Nav.Item>
                    </Nav>
            </Navbar>
        </>
    )
}

export default Header;