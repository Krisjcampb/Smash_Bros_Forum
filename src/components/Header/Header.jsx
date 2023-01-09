import React from 'react'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import Logo from '../Images/pnw-smash-hub-high-resolution-color-logo.png'

export default function Header() {
  	return (
      <>
        <Navbar bg='primary' variant='dark'>
          <Container className = 'mx-0 px-0'>
            <img
              className ='img-fluid'
              style={{ width: 150 }}
              alt='Logo'
              src={Logo}
            />
            <Navbar.Brand href='#home'>Navbar</Navbar.Brand>
            <Nav className='me-auto'>
              <Nav.Link href='#home'>Home</Nav.Link>
              <Nav.Link href='#features'>Features</Nav.Link>
              <Nav.Link href='#pricing'>Pricing</Nav.Link>
            </Nav>
          </Container>
        </Navbar>
      </>
    )
}
