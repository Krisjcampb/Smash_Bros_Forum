import React, { useState, useEffect } from 'react'
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'
import { NavLink } from 'react-router-dom'

const ListContent = () => {
    const [list, setList] = useState([])
    const [image, setImage] = useState([])

    useEffect(() => {
        const getList = async () => {
          try {
            const response = await fetch('http://localhost:5000/forumcontent')
            const jsonData = await response.json()

            setList(jsonData)
          } catch (err) {
            console.error(err.message)
          }
        }

        const getImages = async () => {
          try {
            const response = await fetch('http://localhost:5000/forumimages')
            const jsonData = await response.json()
            setImage(jsonData)
          } catch (err) {
            console.error(err.message)
          }
        }
        getImages()
        getList()
    }, [])
    
    return (
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
        {list.map((e, index) => (
          <Card style={{ width: '25rem', height: '25rem' }} key={index}>
            <Card.Img height={250} src={image[index].filepath.slice(6)} />
            <Card.Body>
              <Card.Title>{e.title}</Card.Title>
              <Card.Text className='text-truncate-container'>
                {e.content}
              </Card.Text>
              <NavLink to={`/threads/${e.thread_id}`} state={e}>
                <div className='position-absolute left-0 bottom-0 pb-16'>
                  <Button variant='primary'>Go somewhere</Button>
                </div>
              </NavLink>
            </Card.Body>
          </Card>
        ))}
      </div>
    )
}
export default ListContent
