import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Container, Row, Col } from 'react-bootstrap'

function UserComments(){
    const [comments, setComments] = useState([])
    const location = useLocation()
    const updatedNums = (time) => {
        const timedisplayed = new Date(time.replace(' ', 'T'))
        return timedisplayed.toString().substring(4, 25)
    }
    const getComments = async () => {
        try {
        const response = await fetch(
            `http://localhost:5000/forumcomments/${location.state.thread_id}`
        )
        const jsonData = await response.json()
        setComments(jsonData)

        } catch (err) {
        console.error(err.message)
        }
    }
    useEffect(() => {
        getComments()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <>
        <div
          style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}
        >
          {comments.map((e) => (
            <Container className='square bg-secondary rounded ps-40 pb-32 pt-16 m-24 ms-128 me-128'>
              <Row>
                <Col className='fw-bold top-left'>{e.username}</Col>
                <Col className='top-right text-end pe-24'>{updatedNums(e.timeposted)}</Col>
              </Row>
              <Row>
                <Col className='pt-8'>{e.comment}</Col>
              </Row>
            </Container>
          ))}
        </div>
      </>
    )
}
export default UserComments;
