import React from 'react'
import { Container, Row, Col, Nav, Navbar } from 'react-bootstrap'
import Logo from '../Images/smash-point-high-resolution-logo.png'

export default function App() {
  return (
    <Container fluid variant="footer" className='bg-primary pt-32 d-flex w-100' style={{ 
        position: 'relative',
        zIndex: 10 
      }}>
        <Navbar className='d-flex'>
            <img src={Logo} className='img-fixed' alt='Logo' width={"400"} />
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
                            <Nav.Link href='/'>Home</Nav.Link>
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
                    <Col>
                        <Row>
                            <Nav.Item>
                                <Nav.Link href='/terms'>Terms of Service</Nav.Link>
                            </Nav.Item>
                        </Row>
                        <Row>
                            <Nav.Item>
                                <Nav.Link href='/privacy'>Privacy Policy</Nav.Link>
                            </Nav.Item>
                        </Row>
                    </Col>
                </Row>
            </Nav>
        </Navbar>
    </Container>
  )
}
