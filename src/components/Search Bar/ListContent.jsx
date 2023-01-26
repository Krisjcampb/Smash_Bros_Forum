import React, { useState, useEffect } from 'react'
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'

const ListContent = () => {
    const [list, setList] = useState([])
    const getList = async () => {
        try {
            const response = await fetch('http://localhost:5000/forumcontent')
            const jsonData = await response.json()

            setList(jsonData)
        } catch (err) {
            console.error(err.message)
        }
    };

    useEffect(() => {
        getList()
    }, [])

    console.log(list)

    return (
        <div
        style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}
        >
                    {list.map(e => (
                    <Card style={{ width: '15rem' }}>
                        <Card.Img variant='top' src='Images/004.JPG' />
                        <Card.Body>
                        <Card.Title>{e.title}</Card.Title>
                        <Card.Text>{e.content}</Card.Text>
                        <Button variant='primary'>Go somewhere</Button>
                        </Card.Body>
                    </Card>
                    ))}
        </div>
    )
}
export default ListContent
