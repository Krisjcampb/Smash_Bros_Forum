import React, { useState } from 'react'
import { Container, Form, Dropdown, DropdownButton, Button, Alert, Row, Col } from 'react-bootstrap'

function Feedback() {

    const [problem, setProblem] = useState("Select Your Issue")
    const [message, setMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [feedbacksubmit, setFeedbackSubmit] = useState(false)

    const changeProblem = (selectedissue) => {
        setProblem(selectedissue)
        setErrorMessage("")
    }

    const SubmitFeedback = async () => {
        if (problem === "Select Your Issue") {
            setErrorMessage("Please select an issue from the dropdown.")
            return
        }
        else if (message.length > 1000){
            setErrorMessage("Description is past the 1000 character limit.")
            return
        }
        else if (message.length < 10){
            setErrorMessage("Please describe the issue.")
            return
        }
        try {
            const response = await fetch('http://localhost:5000/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({issue: problem, message}),
            })
            const data = await response.json();

            if(data.success) {
                console.log("Feedback successfully sent.")
                setFeedbackSubmit(true)
            }
            else{
                setErrorMessage("There was an error submitting your feedback.")
            }
        } catch (err) {
            console.error(err.message)
            setErrorMessage("There was an error submitting your feedback.")
        }
    } 

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col xs={12} md={10} lg={8}>
                    <div className='text-center' style={{ fontSize: '24px', fontWeight: 'bold' }}>Feedback Form</div>

                    {feedbacksubmit ? (
                        <div className="d-flex justify-content-center">
                            <Alert variant="success" className="mb-3" style={{ width: 'auto' }}>
                                Feedback Submitted
                            </Alert>
                        </div>
                    ) : (
                        <Form className="mt-16">
                            {errorMessage && (
                                <div className="d-flex justify-content-center">
                                    <Alert variant="danger" className="mb-3" style={{ width: 'auto' }}>
                                        {errorMessage}
                                    </Alert>
                                </div>
                            )}

                            <Form.Group className="mb-16 mt-16">
                                <DropdownButton 
                                    id="dropdown-basic-button" 
                                    title={problem} 
                                    onSelect={changeProblem} 
                                    className="w-100" 
                                    variant="outline-primary"
                                >
                                    <Dropdown.Item eventKey="Login Issue">Login Issues</Dropdown.Item>
                                    <Dropdown.Item eventKey="UI Design">UI Design</Dropdown.Item>
                                    <Dropdown.Item eventKey="Content Errors">Content Errors</Dropdown.Item>
                                    <Dropdown.Item eventKey="Performance">Performance</Dropdown.Item>
                                    <Dropdown.Item eventKey="Other">Other</Dropdown.Item>
                                </DropdownButton>
                            </Form.Group>


                            <Form.Group className="mb-24" style={{ position: 'relative' }}>
                                <Form.Label>Describe the Issue</Form.Label>
                                <Form.Control 
                                    as="textarea" 
                                    rows={15} 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)}
                                    style={{ 
                                        resize: 'none', 
                                        width: '100%',
                                        margin: '0 auto',
                                    }}
                                />
                                <span 
                                    style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '12px',
                                        fontSize: '0.875rem',
                                        color: message.length > 1000 ? 'red' : 'gray',
                                    }}
                                >
                                    {message.length}/1000
                                </span>
                            </Form.Group>

                            <div className="text-center">
                                <Button onClick={SubmitFeedback} variant="primary" style={{ width: '150px' }}>Submit</Button>
                            </div>
                        </Form>
                    )}
                </Col>
            </Row>
        </Container>
    );
}
export default Feedback