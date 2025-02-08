import React, { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

function Calendar() {

    const calendarRef = useRef(null);

    useEffect(() => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            console.log(calendarApi)
        }
    }, []);

    return (
        <div 
            style={{
                width: '85vw',
                height: '85vh',
                maxWidth: '100vw',
                maxHeight: '100vh',
                margin: '0 auto',
                boxSizing: 'border-box',
                overflow: 'hidden'
            }}
        >
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                contentHeight="auto"
                aspectRatio={1.5}
            />
        </div>
    )
}
export default Calendar