import React, { useState, useEffect, useCallback } from 'react'
import Card from 'react-bootstrap/Card'
import { NavLink } from 'react-router-dom'
import {Row, Col} from 'react-bootstrap'
import Form from 'react-bootstrap/Form'

const ListContent = () => {
    const [list, setList] = useState([])
    const [originalList, setOriginalList] = useState([])
    const [image, setImage] = useState([])
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('')
    const [filteredPosts, setFilteredPosts] = useState([])
    
    const filterPosts = useCallback(() => {
        const filteredPosts = originalList.filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredPosts(filteredPosts)
    }, [searchTerm, originalList]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
    }

    useEffect(() => {
        filterPosts();
    }, [searchTerm, originalList, filterPosts])

    useEffect(() => {
        setList(searchTerm ? [...filteredPosts] : [...originalList]);
    }, [searchTerm, filteredPosts, originalList])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [listResponse, imageResponse] = await Promise.all([
                  fetch('http://localhost:5000/forumcontent'),
                  fetch('http://localhost:5000/forumimages'),
                ])
                const listData = await listResponse.json();
                const imageData = await imageResponse.json();

                setOriginalList(listData)
                setList(listData)
                setImage(imageData)
            } catch (err) {
                console.error(err.message)
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [])
    
    if (loading) {
        return <div className='fs-4 text-center mt-16'>Loading...</div>
    }
    return (
      <>
        <Row className='mt-16 ms-auto me-auto mb-16 mw-25'>
          <Col>
            <Form.Control
              type='text'
              placeholder='Search'
              className='text-center'
              onChange={handleSearch}
            />
          </Col>
        </Row>
        <div
          className='justify-content-center'
          style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}
        >
          {list.map((e, index) => (
            <Card style={{ width: '25rem', height: '25rem', transition: 'transform 0.2s' }} key={index} className="hover-card">
              <NavLink
                to={`/threads/${e.thread_id}`}
                className='nav-link'
                state={e}
              >
                <Card.Img height={250} src={image[index].filepath.slice(6)} />
                <Card.Body>
                  <Card.Title>{e.title}</Card.Title>
                  <Card.Text className='text-truncate-container'>
                    {e.content}
                  </Card.Text>
                  <div className='position-absolute left-0 bottom-0 pb-4' style={{fontWeight: 'bold'}}>
                    Posted by <NavLink to={`/userdetails/${e.username}`}>{e.username}</NavLink>
                  </div>
                </Card.Body>
              </NavLink>
            </Card>
          ))}
        </div>
      </>
    )
}
export default ListContent
