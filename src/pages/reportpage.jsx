import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Button, Card, Row, Col, Modal, Form } from 'react-bootstrap';

const ModerationReports = () => {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [reviewedCount, setReviewedCount] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [modNotes, setModNotes] = useState('');
    const [allowResolutionChange, setAllowResolutionChange] = useState(false);
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

    useEffect(() => {
        console.log("reports: ", reports)
        const count = reports.filter(report => report.is_reviewed === false).length 
        setReviewedCount(count);
        console.log(count)
    }, [reports]);

    // Open report detail modal
    const handleViewReport = (report) => {
        try{
            setAllowResolutionChange(false)
            setModNotes(report.mod_notes || '');
            setSelectedReport(report);
            setShowModal(true);
        } catch (error) {
            console.error('Error displaying details.');
        }
    };
    
    const resolveReport = async (resolutionStatus, reportType) => {
        if (!selectedReport) return;

        const content_id =
            selectedReport.thread_id ?? selectedReport.comment_id;

        const response = await fetch('http://localhost:5000/resolvereport', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                report_id: selectedReport.report_id,
                resolution_status: resolutionStatus,
                mod_notes: modNotes,
                report_type: selectedReport.report_type,
                content_id: content_id
            })
        });

        if (response.ok) {
            fetchReports();
            setShowModal(false);
            setSelectedReport(null);
            setModNotes('');
        }
    };

    // const banUser = async (report) => {
    //     try{
    //         const response = await fetch('')
    //     }catch (error) {
    //         console.error('Error banning user.')
    //     }
    // }

    useEffect(() => {
        fetchReports();
    }, []);

    const RESOLUTION_LABELS = {
        dismissed: 'Dismissed',
        resolved: 'Resolved (No Action)',
        content_removed: 'Content Removed',
    };

    // Get badge color based on status
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'resolved': return 'success';
            case 'dismissed': return 'secondary';
            case 'content_removed': return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <h2 className='text-center'>Moderation Reports</h2>
                    
                    {/* Quick Stats */}
                    <Row className="mb-4 justify-content-center">
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
                                        {reviewedCount}
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
                            <Table striped hover responsive className='text-center'>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Type</th>
                                        <th>Reason</th>
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
                                                <Badge bg={
                                                    report.resolution_status === 'dismissed' ? 'secondary' :
                                                    report.resolution_status === 'content_removed' ? 'danger' :
                                                    report.resolution_status === 'resolved' ? 'success' :
                                                    'warning'
                                                }>
                                                    {RESOLUTION_LABELS[report.resolution_status] ?? 'Pending'}
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
                                <p><strong>Type:</strong> {selectedReport.report_type}</p>
                                <p><strong>Entity ID:</strong> {selectedReport.report_id}</p>
                                <p><strong>Reason:</strong> {selectedReport.reason}</p>
                                <p><strong>Description:</strong> {selectedReport.report_desc || 'No additional description'}</p>
                                <p><strong>Status:</strong>
                                    <Badge bg={getStatusColor(selectedReport.resolution_status)} className="ms-2">
                                    {RESOLUTION_LABELS[selectedReport.resolution_status]}
                                    </Badge>
                                </p>
                            </Col>
                            <Col md={6}>
                                <h6>User Information</h6>
                                <p><strong>Reported by:</strong> {selectedReport.reporter_username}</p>
                                <p><strong>Reported user:</strong> {selectedReport.reported_username}</p>
                                <p><strong>Date reported:</strong> {new Date(selectedReport.reported_at).toLocaleString()}</p>
                                
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
                            value={modNotes}
                            onChange={(e) => setModNotes(e.target.value)}
                            placeholder="Add notes about how this report was handled..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="flex-column align-items-stretch">
                {(!selectedReport?.is_reviewed || allowResolutionChange) ? (
                    <>
                        <div>
                            <Button
                                variant="secondary"
                                className="w-100"
                                onClick={() => resolveReport('dismissed')}
                            >
                                Dismiss Report
                            </Button>
                            <div className="text-muted small">
                                No violation found. Content remains unchanged.
                            </div>
                        </div>

                        <div className="mt-2">
                            <Button
                                variant="warning"
                                className="w-100"
                                onClick={() => resolveReport('resolved')}
                            >
                                Mark Resolved
                            </Button>
                            <div className="text-muted small">
                                Reviewed with no content action taken.
                            </div>
                        </div>

                        <div className="mt-2">
                            <Button
                                variant="danger"
                                className="w-100"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                Delete Content
                            </Button>
                            <div className="text-muted small">
                                Confirms violation and removes content.
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-center text-muted mb-2">
                            This report has already been reviewed.
                        </div>

                        <Button
                            variant="outline-primary"
                            className="w-100"
                            onClick={() => setAllowResolutionChange(true)}
                        >
                            Change Resolution
                        </Button>
                    </>
                )}
            </Modal.Footer>
            </Modal>
            <Modal
                show={showDeleteConfirm}
                onHide={() => setShowDeleteConfirm(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Content Deletion</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        This action will permanently remove the reported content.
                    </p>
                    <p className="text-danger mb-0">
                        This cannot be undone.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => {
                            resolveReport('content_removed');
                            setShowDeleteConfirm(false);
                        }}
                    >
                        Yes, Delete Content
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ModerationReports;