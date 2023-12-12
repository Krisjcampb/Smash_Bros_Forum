import React, {useState} from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container, Row, Col} from 'react-bootstrap'

function BasicExample() {
    return (
      <Container>
        <Row>
          <Col xs={12} md={8} className='border'>
            Hello
          </Col>
          <Col xs={12} md={4} className='border'>
            World
          </Col>
        </Row>
      </Container>
    )
}

export default BasicExample
