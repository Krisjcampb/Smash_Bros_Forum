import React from 'react'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import Logo from '../Images/pnw-smash-hub-high-resolution-color-logo.png'

export default function Header() {
  	return (
        <>
            <Navbar bg='primary' variant='dark'>
                    <img
                    className ='img-fluid'
                    style={{ width: 150 }}
                    alt='Logo'
                    src={Logo}
                    />
                    <Navbar.Brand href='#home'>Navbar</Navbar.Brand>
                    <Nav className='container-fluid'>
                        <Nav.Item>
                            <Nav.Link href='/'>Home</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link href='#features'>Features</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link href='#pricing'>Pricing</Nav.Link>
                        </Nav.Item>
                        <Nav.Item className='ms-auto'>
                            <Nav.Link href='/userdetails'>User Account</Nav.Link>
                        </Nav.Item>
                    </Nav>
            </Navbar>
        </>
    )
}
