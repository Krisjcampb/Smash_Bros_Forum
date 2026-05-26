import React, { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Modal, Button, Form, InputGroup, Alert } from 'react-bootstrap';
import { BsCalendarEventFill, BsGeoAltFill, BsLink45Deg, BsClock } from 'react-icons/bs';
import { API } from '../components/Utilities/apiUrl';

function Calendar() {
    const calendarRef = useRef(null);
    const [events, setEvents] = useState([]);
    const [userRole, setUserRole] = useState('');
    const [token] = useState(localStorage.getItem('token'));

    // Add event modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location, setLocation] = useState('');
    const [url, setUrl] = useState('');
    const [addError, setAddError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // View event modal state
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const isPrivileged = userRole === 'admin' || userRole === 'moderator';

    // Fetch events and auth on mount
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
        fetchEvents();
        if (token) {
            fetch(`${API}/userauthenticate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                },
            })
            .then(res => res.json())
            .then(data => setUserRole(data.role))
            .catch(err => console.error('Error fetching user role:', err));
        }
    }, [token, fetchEvents]);

    // Clicking a date opens the add modal for privileged users
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

    // Clicking an existing event opens the view modal
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
            const response = await fetch(`${API}/calendar-events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
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
            await fetch(`${API}/calendar-events/${selectedEvent.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token },
            });
            await fetchEvents();
            setShowViewModal(false);
        } catch (err) {
            console.error('Error deleting event:', err);
        }
    };

    return (
        <div style={{
            width: '100%',
            maxWidth: '1400px',
            margin: '2rem auto',
            padding: '0 1rem',
            boxSizing: 'border-box',
        }}>
            {/* Hint for privileged users so they know they can click dates */}
            {isPrivileged && (
                <div style={{
                    textAlign: 'center',
                    marginBottom: '0.75rem',
                    fontSize: '0.82rem',
                    color: '#888',
                }}>
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
                // Only show the pointer cursor on dates when privileged
                dayCellClassNames={isPrivileged ? 'fc-day-clickable' : ''}
                eventColor="#393933"
                eventTextColor="#FFD443"
            />

            {/* Add event modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <div style={{
                    background: '#393933',
                    borderRadius: '8px 8px 0 0',
                    padding: '1.5rem 2rem 1.25rem',
                    borderBottom: '4px solid #FFD443',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{
                            display: 'inline-block',
                            background: '#FFD443',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#393933',
                            marginBottom: '0.4rem',
                        }}>
                            {selectedDate}
                        </div>
                        <h5 style={{ color: '#ffffff', fontWeight: '800', margin: 0 }}>
                            Add Event
                        </h5>
                    </div>
                    <button
                        onClick={() => setShowAddModal(false)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>

                <Modal.Body style={{ padding: '1.5rem 2rem' }}>
                    {addError && (
                        <Alert variant="danger" style={{ fontSize: '0.85rem', padding: '0.6rem 1rem' }}>
                            {addError}
                        </Alert>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label >Title</Form.Label>
                        <InputGroup>
                            <InputGroup.Text ><BsCalendarEventFill size={14} /></InputGroup.Text>
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
                        <Form.Label >Start Time</Form.Label>
                        <InputGroup>
                            <InputGroup.Text ><BsClock size={14} /></InputGroup.Text>
                            <Form.Control
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label >
                            End Time{' '}
                            <span style={{ fontWeight: '400', color: '#aaa', fontSize: '0.8rem' }}>(optional)</span>
                        </Form.Label>
                        <InputGroup>
                            <InputGroup.Text ><BsClock size={14} /></InputGroup.Text>
                            <Form.Control
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label >
                            Location{' '}
                            <span style={{ fontWeight: '400', color: '#aaa', fontSize: '0.8rem' }}>(optional)</span>
                        </Form.Label>
                        <InputGroup>
                            <InputGroup.Text ><BsGeoAltFill size={14} /></InputGroup.Text>
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
                        <Form.Label >
                            URL{' '}
                            <span style={{ fontWeight: '400', color: '#aaa', fontSize: '0.8rem' }}>(optional)</span>
                        </Form.Label>
                        <InputGroup>
                            <InputGroup.Text ><BsLink45Deg size={14} style={{ flexShrink: 0, color: '#393933' }} /></InputGroup.Text>
                            <Form.Control
                                type="url"
                                placeholder="https://..."
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                
                            />
                        </InputGroup>
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer style={{ borderTop: '1px solid #e0e0dc', padding: '1rem 2rem' }}>
                    <Button
                        variant="outline-secondary"
                        onClick={() => setShowAddModal(false)}
                        style={{ borderRadius: '8px', fontWeight: '600' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddEvent}
                        disabled={isSaving}
                        style={{
                            background: '#393933',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            color: '#FFD443',
                            padding: '0.5rem 1.5rem',
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Add Event'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* View event modal */}
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
                <div style={{
                    background: '#393933',
                    borderRadius: '8px 8px 0 0',
                    padding: '1.5rem 2rem 1.25rem',
                    borderBottom: '4px solid #FFD443',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{
                            display: 'inline-block',
                            background: '#FFD443',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#393933',
                            marginBottom: '0.4rem',
                        }}>
                            Event
                        </div>
                        <h5 style={{ color: '#ffffff', fontWeight: '800', margin: 0 }}>
                            {selectedEvent?.title}
                        </h5>
                    </div>
                    <button
                        onClick={() => setShowViewModal(false)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>

                <Modal.Body style={{ padding: '1.5rem 2rem' }}>
                    {selectedEvent && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#555' }}>
                                <BsClock size={14} style={{ flexShrink: 0, color: '#393933' }} />
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#555' }}>
                                    <BsGeoAltFill size={14} style={{ flexShrink: 0, color: '#393933' }} />
                                    <span>{selectedEvent.location}</span>
                                </div>
                            )}

                            {selectedEvent.url && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                                    <BsLink45Deg size={14} style={{ flexShrink: 0, color: '#393933' }} />
                                    <a
                                        href={selectedEvent.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#393933', fontWeight: '600', wordBreak: 'break-all' }}
                                    >
                                        {selectedEvent.url}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer style={{ borderTop: '1px solid #e0e0dc', padding: '1rem 2rem' }}>
                    <Button
                        variant="outline-secondary"
                        onClick={() => setShowViewModal(false)}
                        style={{ borderRadius: '8px', fontWeight: '600' }}
                    >
                        Close
                    </Button>
                    {/* Only show delete button to admins and moderators */}
                    {isPrivileged && (
                        <Button
                            variant="outline-danger"
                            onClick={handleDeleteEvent}
                            style={{ borderRadius: '8px', fontWeight: '600' }}
                        >
                            Delete Event
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            <style>{`
                .fc-day-clickable .fc-daygrid-day:hover {
                    background-color: rgba(255, 212, 67, 0.15);
                    cursor: pointer;
                }
                .fc-event {
                    cursor: pointer;
                }

                /* Dark mode calendar text */
                .dark-theme .fc {
                    color: #e0e0e0;
                }

                .dark-theme .fc-day-other .fc-daygrid-day-number {
                    color: #666;
                }

                .dark-theme .fc-col-header-cell-cushion,
                .dark-theme .fc-daygrid-day-number {
                    color: #e0e0e0;
                }

                .dark-theme .fc-toolbar-title {
                    color: #ffffff;
                }

                .light-theme .fc-button {
                    background-color: #383838 !important;
                    border-color: #555 !important;
                    color: #e9e9e9 !important;
                }
                .dark-theme .fc-button {
                    background-color: #393933 !important;
                    border-color: #555 !important;
                    color: #FFD443 !important;
                }

                .dark-theme .fc-button:hover {
                    background-color: #FFD443 !important;
                    color: #393933 !important;
                }

                .dark-theme .fc-button-active {
                    background-color: #FFD443 !important;
                    color: #393933 !important;
                }

                .dark-theme .fc-daygrid-day {
                    background-color: #2b2b2b;
                }

                .dark-theme .fc-scrollgrid,
                .dark-theme .fc-scrollgrid td,
                .dark-theme .fc-scrollgrid th {
                    border-color: #444 !important;
                }

                .dark-theme .fc-day-today {
                    background-color: rgb(80, 70, 35) !important;
                }
                .dark-theme .fc-event-title,
                .dark-theme .fc-event-time {
                    color: #FFD443 !important;
                }
                .dark-theme .fc-daygrid-event-dot {
                    border-color: #FFD443 !important;
                }

                .dark-theme .fc-list-event-dot {
                    border-color: #FFD443 !important;
                }
            `}</style>
        </div>
    );
}

export default Calendar;