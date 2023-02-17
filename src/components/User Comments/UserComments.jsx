import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Container } from 'react-bootstrap'

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
            <Container className='square bg-secondary rounded ps-32 pb-64 pt-32 m-32'>
                <span className='fw-bold'>{e.username}</span>
                <span> {updatedNums(e.timeposted)}</span>
                <div className='mt-16'>{e.comment}</div>
            </Container>
            ))}
        </div>
      </>
    )
}
export default UserComments;
