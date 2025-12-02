import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Row, Col, Modal, Form } from 'react-bootstrap';

const ModerationReports = () => {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const token = localStorage.getItem('token');

    // Fetch reports from backend
    const fetchReports = async () => {
        try {
            const response = await fetch('http://localhost:5000/viewreports', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            console.log("Data: ", data)
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        }
    };

    // Handle report resolution
    const handleResolveReport = async (status) => {
        try {
            const response = await fetch(`http://localhost:5000/api/reports/${selectedReport.report_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    resolution_notes: resolutionNotes
                })
            });

            if (response.ok) {
                // Refresh reports list
                fetchReports();
                setShowModal(false);
                setSelectedReport(null);
                setResolutionNotes('');
            }
        } catch (error) {
            console.error('Error resolving report:', error);
        }
    };

    // Open report detail modal
    const handleViewReport = (report) => {
        setSelectedReport(report);
        setShowModal(true);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // Get badge color based on status
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'resolved': return 'success';
            case 'dismissed': return 'secondary';
            default: return 'secondary';
        }
    };

    // Get badge color based on priority
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'secondary';
        }
    };

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <h2>Moderation Reports</h2>
                    
                    {/* Quick Stats */}
                    <Row className="mb-4">
                        <Col md={3}>
                            <Card className="text-center">
                                <Card.Body>
                                    <Card.Title>Total Reports</Card.Title>
                                    <h3>{reports.length}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="text-center">
                                <Card.Body>
                                    <Card.Title>Pending</Card.Title>
                                    <h3 className="text-warning">
                                        {reports.filter(r => r.status === 'pending').length}
                                    </h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="text-center">
                                <Card.Body>
                                    <Card.Title>High Priority</Card.Title>
                                    <h3 className="text-danger">
                                        {reports.filter(r => r.priority === 'high').length}
                                    </h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="text-center">
                                <Card.Body>
                                    <Card.Title>Resolved Today</Card.Title>
                                    <h3 className="text-success">
                                        {reports.filter(r => 
                                            r.status === 'resolved' && 
                                            new Date(r.resolved_at).toDateString() === new Date().toDateString()
                                        ).length}
                                    </h3>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Reports Table */}
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">All Reports</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table striped hover responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Type</th>
                                        <th>Reason</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Reported By</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(reports) && reports.map(report => (
                                        <tr key={report.report_id}>
                                            <td>#{report.report_id}</td>
                                            <td>
                                                <Badge bg="secondary">
                                                    {report.report_type}
                                                </Badge>
                                            </td>
                                            <td>{report.reason}</td>
                                            <td>
                                                <Badge bg={getPriorityColor(report.priority)}>
                                                    {report.priority}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge bg={getStatusColor(report.status)}>
                                                    {report.status}
                                                </Badge>
                                            </td>
                                            <td>{report.reported_uid}</td>
                                            <td>
                                                {new Date(report.reported_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => handleViewReport(report)}
                                                >
                                                    Review
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {reports.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="text-center text-muted py-4">
                                                No reports found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Report Detail Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Report Details #{selectedReport?.report_id}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedReport && (
                        <Row>
                            <Col md={6}>
                                <h6>Report Information</h6>
                                <p><strong>Type:</strong> {selectedReport.reported_entity_type}</p>
                                <p><strong>Entity ID:</strong> {selectedReport.reported_entity_id}</p>
                                <p><strong>Reason:</strong> {selectedReport.reason}</p>
                                <p><strong>Description:</strong> {selectedReport.description || 'No additional description'}</p>
                                <p><strong>Priority:</strong> 
                                    <Badge bg={getPriorityColor(selectedReport.priority)} className="ms-2">
                                        {selectedReport.priority}
                                    </Badge>
                                </p>
                                <p><strong>Status:</strong> 
                                    <Badge bg={getStatusColor(selectedReport.status)} className="ms-2">
                                        {selectedReport.status}
                                    </Badge>
                                </p>
                            </Col>
                            <Col md={6}>
                                <h6>User Information</h6>
                                <p><strong>Reported by:</strong> User {selectedReport.reporter_id}</p>
                                <p><strong>Reported user:</strong> User {selectedReport.reported_user_id}</p>
                                <p><strong>Date reported:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p>
                                
                                {selectedReport.resolved_at && (
                                    <p><strong>Resolved at:</strong> {new Date(selectedReport.resolved_at).toLocaleString()}</p>
                                )}
                            </Col>
                        </Row>
                    )}
                    
                    <Form.Group className="mt-3">
                        <Form.Label>Resolution Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Add notes about how this report was handled..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={() => handleResolveReport('dismissed')}
                    >
                        Dismiss Report
                    </Button>
                    <Button 
                        variant="warning" 
                        onClick={() => handleResolveReport('resolved')}
                    >
                        Mark Resolved
                    </Button>
                    <Button 
                        variant="danger"
                        onClick={() => {
                            // Add delete content logic here
                            handleResolveReport('resolved');
                        }}
                    >
                        Delete Content
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ModerationReports;