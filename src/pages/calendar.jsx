import React, { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

function Calendar() {

    const calendarRef = useRef(null);

    useEffect(() => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
        }
    }, []);

    return (
        <div style={{ width: '85%', margin: '0 auto' }}>
            <FullCalendar ref={calendarRef} plugins={[dayGridPlugin]} initialView="dayGridMonth"/>
        </div>
    )
}
export default Calendar