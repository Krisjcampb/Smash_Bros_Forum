import React from 'react'
import { Container } from 'react-bootstrap'
import ListUsers from '../components/Search Bar/ListUsers'

function BasicExample() {
    return (
        <Container>
            <div className='h4 text-center mt-48'>User List</div>
            <ListUsers/>
        </Container>
    )
}

export default BasicExample
