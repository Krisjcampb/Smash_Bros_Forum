import React from 'react'
import { Container, Row, Col, Nav, Navbar } from 'react-bootstrap'
import Logo from '../Images/pnw-smash-hub-high-resolution-logo-color-on-transparent-background.png'

export default function App() {
  return (
    <Container fluid variant="footer" className='bg-primary pt-32 d-flex w-100'>
        <Navbar className='d-flex'>
            <img src={Logo} className='img-fixed' alt='Logo' width={"300"} />
        </Navbar>
        <Navbar className='mx-auto'>
            <Nav>
                <Row className='text-center'>
                    <Col className='h6 gap-1'>
                        <Nav.Item as='li'>
                            <Nav.Link href='/contact'>Contact Us</Nav.Link>
                        </Nav.Item>
                        <Nav.Item as='li'>
                            <Nav.Link href='/about'>About Us</Nav.Link>
                        </Nav.Item>
                        <Nav.Item as='li'>
                            <Nav.Link href='/signin'>Sign In</Nav.Link>
                        </Nav.Item>
                        <Nav.Item as='li'>
                            <Nav.Link href='/'>Home</Nav.Link>
                        </Nav.Item>
                        <Nav.Item as='li'>
                            <Nav.Link href='/register'>Register</Nav.Link>
                        </Nav.Item>
                        <Nav.Item as='li'>
                            <Nav.Link href='/userlist'>User List</Nav.Link>
                        </Nav.Item>
                    </Col>
                    <Col>
                        <div className='d-flex'>
                        <div className='pe-16'>Twitter</div>
                        <div className='pe-16'>Facebook</div>
                        <div className='pe-16'>Instagram</div>
                    </div>
                    </Col>
                </Row>
            </Nav>
        </Navbar>
    </Container>
  )
}
