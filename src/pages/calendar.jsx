import React, { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Modal, Button, Form, InputGroup, Alert } from 'react-bootstrap';
import { BsCalendarEventFill, BsGeoAltFill, BsLink45Deg, BsClock } from 'react-icons/bs';
import { API } from '../components/Utilities/apiUrl';
import { authFetch } from '../Utilities/authHelpers';

function Calendar() {
    const calendarRef = useRef(null);
    const [events, setEvents] = useState([]);
    const [userRole, setUserRole] = useState('');
    const [token] = useState(localStorage.getItem('token'));

    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location, setLocation] = useState('');
    const [url, setUrl] = useState('');
    const [addError, setAddError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 575);

    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const isPrivileged = userRole === 'admin' || userRole === 'moderator';

    const fetchEvents = useCallback(async () => {
        try {
            const response = await fetch(`${API}/calendar-events`);
            const data = await response.json();
            setEvents(data.map(e => ({
                id: String(e.event_id),
                title: e.title,
                start: e.start_date,
                end: e.end_date || undefined,
                extendedProps: {
                    location: e.location,
                    url: e.url,
                }
            })));
        } catch (err) {
            console.error('Error fetching events:', err);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 575);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchEvents();
        if (token) {
            authFetch(API, `${API}/userauthenticate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            })
            .then(res => res.json())
            .then(data => setUserRole(data.role))
            .catch(err => console.error('Error fetching user role:', err));
        }
    }, [token, fetchEvents]);

    const handleDateClick = (info) => {
        if (!isPrivileged) return;
        setSelectedDate(info.dateStr);
        setTitle('');
        setStartTime('09:00');
        setEndTime('');
        setLocation('');
        setUrl('');
        setAddError('');
        setShowAddModal(true);
    };

    const handleEventClick = (info) => {
        setSelectedEvent({
            id: info.event.id,
            title: info.event.title,
            start: info.event.start,
            end: info.event.end,
            location: info.event.extendedProps.location,
            url: info.event.extendedProps.url,
        });
        setShowViewModal(true);
    };

    const handleAddEvent = async () => {
        if (!title.trim()) {
            setAddError('Title is required');
            return;
        }

        setIsSaving(true);
        setAddError('');

        const startDateTime = startTime
            ? `${selectedDate}T${startTime}:00`
            : `${selectedDate}T00:00:00`;

        const endDateTime = endTime
            ? `${selectedDate}T${endTime}:00`
            : null;

        try {
            const response = await authFetch(API, `${API}/calendar-events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    start_date: startDateTime,
                    end_date: endDateTime,
                    location,
                    url,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                setAddError(data.error || 'Failed to create event');
                return;
            }

            await fetchEvents();
            setShowAddModal(false);
        } catch (err) {
            console.error('Error creating event:', err);
            setAddError('Something went wrong. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        try {
            await authFetch(API, `${API}/calendar-events/${selectedEvent.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            await fetchEvents();
            setShowViewModal(false);
        } catch (err) {
            console.error('Error deleting event:', err);
        }
    };

    return (
        <div className="calendar-page">
            {isPrivileged && (
                <div className="calendar-hint">
                    Click any date to add an event
                </div>
            )}

            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                contentHeight="auto"
                aspectRatio={1.5}
                events={events}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                dayCellClassNames={isPrivileged ? 'fc-day-clickable' : ''}
                dayMaxEvents={isMobile ? 1 : false}
            />

            {/* Add event modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <div className="calendar-modal-header">
                    <div>
                        <div className="calendar-modal-badge">{selectedDate}</div>
                        <h5>Add Event</h5>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="calendar-modal-close">×</button>
                </div>

                <Modal.Body className="calendar-modal-body">
                    {addError && (
                        <Alert variant="danger" className="calendar-modal-alert">
                            {addError}
                        </Alert>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Title</Form.Label>
                        <InputGroup>
                            <InputGroup.Text><BsCalendarEventFill size={14} /></InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Event title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                maxLength={100}
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Start Time</Form.Label>
                        <InputGroup>
                            <InputGroup.Text><BsClock size={14} /></InputGroup.Text>
                            <Form.Control type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>
                            End Time <span className="calendar-optional-label">(optional)</span>
                        </Form.Label>
                        <InputGroup>
                            <InputGroup.Text><BsClock size={14} /></InputGroup.Text>
                            <Form.Control type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>
                            Location <span className="calendar-optional-label">(optional)</span>
                        </Form.Label>
                        <InputGroup>
                            <InputGroup.Text><BsGeoAltFill size={14} /></InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Where is it?"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                maxLength={200}
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group>
                        <Form.Label>
                            URL <span className="calendar-optional-label">(optional)</span>
                        </Form.Label>
                        <InputGroup>
                            <InputGroup.Text><BsLink45Deg size={14} /></InputGroup.Text>
                            <Form.Control
                                type="url"
                                placeholder="https://..."
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                            />
                        </InputGroup>
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer className="calendar-modal-footer">
                    <Button variant="outline-secondary" onClick={() => setShowAddModal(false)} className="calendar-cancel-btn">
                        Cancel
                    </Button>
                    <Button onClick={handleAddEvent} disabled={isSaving} className="calendar-save-btn">
                        {isSaving ? 'Saving...' : 'Add Event'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* View event modal */}
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
                <div className="calendar-modal-header">
                    <div>
                        <div className="calendar-modal-badge">Event</div>
                        <h5>{selectedEvent?.title}</h5>
                    </div>
                    <button onClick={() => setShowViewModal(false)} className="calendar-modal-close">×</button>
                </div>

                <Modal.Body className="calendar-modal-body">
                    {selectedEvent && (
                        <div className="d-flex flex-column gap-2">
                            <div className="calendar-detail-row">
                                <BsClock size={14} />
                                <span>
                                    {new Date(selectedEvent.start).toLocaleString('en-US', {
                                        month: 'long', day: 'numeric', year: 'numeric',
                                        hour: 'numeric', minute: '2-digit', hour12: true
                                    })}
                                    {selectedEvent.end && (
                                        <> — {new Date(selectedEvent.end).toLocaleTimeString('en-US', {
                                            hour: 'numeric', minute: '2-digit', hour12: true
                                        })}</>
                                    )}
                                </span>
                            </div>

                            {selectedEvent.location && (
                                <div className="calendar-detail-row">
                                    <BsGeoAltFill size={14} />
                                    <span>{selectedEvent.location}</span>
                                </div>
                            )}

                            {selectedEvent.url && (
                                <div className="calendar-detail-row">
                                    <BsLink45Deg size={14} />
                                    <a href={selectedEvent.url} target="_blank" rel="noopener noreferrer" className="calendar-detail-link">
                                        {selectedEvent.url}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="calendar-modal-footer">
                    <Button variant="outline-secondary" onClick={() => setShowViewModal(false)} className="calendar-cancel-btn">
                        Close
                    </Button>
                    {isPrivileged && (
                        <Button variant="outline-danger" onClick={handleDeleteEvent} className="calendar-delete-btn">
                            Delete Event
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Calendar;