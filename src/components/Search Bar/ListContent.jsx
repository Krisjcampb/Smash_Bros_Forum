import React, { useState, useEffect, useCallback } from 'react'
import Card from 'react-bootstrap/Card'
import { NavLink } from 'react-router-dom'
import {Row, Col, Button} from 'react-bootstrap'
import Form from 'react-bootstrap/Form'
import { BsArrowUp, BsArrowDown } from 'react-icons/bs'

const ListContent = () => {
    const [list, setList] = useState([])
    const [originalList, setOriginalList] = useState([])
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('')
    const [filteredPosts, setFilteredPosts] = useState([])
    const [user, setUser] = useState("")
    const [userid, setUserId] = useState("")
    const [likedStatus, setLikedStatus] = useState({});
    const [dislikedStatus, setDislikedStatus] = useState({});
    const [likesdislikes, setNetLikesDislikes] = useState([])
    const [initialposts, setInitialPosts] = useState([])
    const [sortBy, setSortBy] = useState('newest');

    const handleLike = async (thread_id) => {
    try {
        const response = await fetch('http://localhost:5000/forumlikes', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userid, thread_id }),
        });
        
        if (response.ok) {
            setLikedStatus(prevStatus => ({
                ...prevStatus,
                [thread_id]: true
            }));
        } else {
            const data = await response.json();
            console.error('Error liking post:', data.error);
        }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleDislike = async (thread_id) => {
    try {
        const response = await fetch('http://localhost:5000/forumdislikes', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userid, thread_id }),
        });
        
        if (response.ok) {
            setDislikedStatus(prevStatus => ({
                ...prevStatus,
                [thread_id]: true
            }));
        } else {
            const data = await response.json();
            console.error('Error disliking post:', data.error);
        }
        } catch (error) {
        console.error('Error disliking post:', error);
        }
    };

    const filterPosts = useCallback(() => {
        const filteredPosts = originalList.filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredPosts(filteredPosts)
    }, [searchTerm, originalList]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
    }

    const sortByNewest = (a, b) => new Date(b.postdate) - new Date(a.postdate);

    const sortByOldest = (a, b) => new Date(a.postdate) - new Date(b.postdate);

    const sortByPopularityAndRecency = (a, b) => {
        // Calculate popularity score based on likes and dislikes
        const popularityA = a.likes - a.dislikes;
        const popularityB = b.likes - b.dislikes;

        // Calculate recency score based on post dates
        const recencyA = new Date() - new Date(a.postdate);
        const recencyB = new Date() - new Date(b.postdate);

        // Weight factors for popularity and recency
        const popularityWeight = 0.7; // Adjust this value based on your preference
        const recencyWeight = 0.3; // Adjust this value based on your preference

        // Combine popularity and recency scores
        const combinedScoreA = (popularityA * popularityWeight) + (recencyA * recencyWeight);
        const combinedScoreB = (popularityB * popularityWeight) + (recencyB * recencyWeight);

        // Sort posts based on combined score
        return combinedScoreB - combinedScoreA; // Sort in descending order
    };

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
    };

    useEffect(() => {
        let sortedList = [...list];
        if (sortBy === 'newest') {
            sortedList.sort(sortByNewest);
        } else if (sortBy === 'oldest') {
            sortedList.sort(sortByOldest);
        } else if (sortBy === 'mostPopular') {
            sortedList.sort(sortByPopularityAndRecency);
        }
        setList(sortedList);
    }, [sortBy]);

    const formatPostDate = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleString();
    }

    useEffect(() => {
        filterPosts();
    }, [searchTerm, originalList, filterPosts])

    useEffect(() => {
        setList(searchTerm ? [...filteredPosts] : [...originalList]);
    }, [searchTerm, filteredPosts, originalList])

    useEffect(() => {
        const token = localStorage.getItem('token');
        if(token) {
            fetch('http://localhost:5000/userauthenticate', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
            })
            .then(response => response.json())
            .then(data => {
                const { id, name } = data;
                setUser(name);
                setUserId(id)
            })
        }
    }, [user])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [listResponse, imageResponse] = await Promise.all([
                  fetch('http://localhost:5000/forumcontent'),
                  fetch('http://localhost:5000/forumimages'),
                ])
                const listData = await listResponse.json();
                const imageData = await imageResponse.json();

                // Associate each post with its corresponding image data
                const postsWithData = listData.map((data, index) => {
                    const data2 = imageData[index];
                    return {
                        ...data,
                        ...data2
                    };
                });
                console.log("postData:", postsWithData)
                setOriginalList(postsWithData)
                setList(postsWithData)
            } catch (err) {
                console.error(err.message)
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [])
    
    useEffect(() => {
        const fetchData = async () => {
            try{
                const [likecount, dislikecount] = await Promise.all([
                    fetch('http://localhost:5000/forumlikes'),
                    fetch('http://localhost:5000/forumdislikes'),
                ])
                const likedata = await likecount.json();
                const dislikedata = await dislikecount.json();

                const netLikesToDislikes = likedata.map((like) => ({
                    post_id: like.post_id,
                    like_count: like.like_count,
                    dislike_count: 0, // Initialize dislike count to 0
                }));
                dislikedata.forEach((dislike) => {
                    const index = netLikesToDislikes.findIndex((item) => item.post_id === dislike.post_id);
                    if (index !== -1) {
                        netLikesToDislikes[index].dislike_count = dislike.dislike_count;
                    } else {
                        netLikesToDislikes.push({
                        post_id: dislike.post_id,
                        like_count: 0,
                        dislike_count: dislike.dislike_count,
                        });
                    }
                });
                const netLikesDislikes = netLikesToDislikes.map((item) => ({
                    post_id: item.post_id,
                    net_likes: item.like_count - item.dislike_count,
                }));
                setNetLikesDislikes(netLikesDislikes)
            }
            catch (err) {
                console.error(err.message)
            }
        }
        fetchData();
    }, [])

    useEffect(() => {
        const initialLikedStatus = list.reduce((acc, post) => {
        return { ...acc, [post.thread_id]: false };
        }, {});
        setLikedStatus(initialLikedStatus);

        const fetchdata2 = async () => {
        try {
            setLoading(true); // Set loading state to true before fetching
            const response = await fetch(`http://localhost:5000/userlikesdislikes?userid=${userid}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await response.json();
            if (Array.isArray(res)) {
                setInitialPosts(res);
            } else {
                console.error('Response is not an array:', res);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false); // Set loading state to false after fetching
        }
    };
    if(userid){
        fetchdata2();
    }
}, [list, userid]);


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
        <Col>
            <Form.Select value={sortBy} onChange={handleSortChange}>
                <option value='newest'>Sort by Newest</option>
                <option value='oldest'>Sort by Oldest</option>
                <option value='mostPopular'>Sort by Most Popular</option>
            </Form.Select>
        </Col>
    </Row>
    <div className='justify-content-center' style={{ display: 'flex', flexDirection: 'row', flexWrap:'wrap' }}>
      {list.map((e, index) => (
        <Card style={{ width: '25rem', height: '26rem', transition: 'transform 0.2s' }} key={index} className="hover-card">
          <Card.Body>
            <NavLink to={`/threads/${e.thread_id}`} className='nav-link' state={e}>
              <Card.Img height={250} src={e.filepath.slice(6)} />
              <Card.Title>{e.title}</Card.Title>
              <Card.Text className='text-truncate-container'>
                {e.content}
              </Card.Text>
            </NavLink>
            <div className='position-absolute bottom-0 end-0 pb-4 pe-4' style={{ fontWeight: 'bold' }}>
              {formatPostDate(e.postdate)} <NavLink to={`/userdetails/${e.username}`} className="nav-link">{e.username}</NavLink>
            </div>
            <div className='position-absolute right-0 bottom-0 pb-4' style={{ display: 'flex', alignItems: 'center' }}>
              <Button variant={initialposts.find(item => item.post_id === e.thread_id && item.type === 'like') ? "success" : "outline-success"} onClick={() => handleLike(e.thread_id)}>
                <BsArrowUp />
              </Button>
              <span style={{ margin: '0 5px' }}>{likesdislikes.find(item => item.post_id === e.thread_id)?.net_likes || 0}</span>
              <Button variant={initialposts.find(item => item.post_id === e.thread_id && item.type === 'dislike') ? "danger" : "outline-danger"} onClick={() => handleDislike(e.thread_id)}>
                <BsArrowDown />
              </Button>
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  </>
    )
}
export default ListContent
