import React, {useState} from "react";
import MonthlyCalendar from "./MonthlyCalendar";

export default function RightSidebar({ width }) {

    const [selectedDate, setSelectedDate] = useState(null);

    const events = [
        { date: "2026-01-10", title: "Meeting" },
        { date: "2026-01-15", title: "Project Due" },
        { date: "2026-01-15", title: "Call" },
    ];

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();


    return (
        <div 
            className="sidebar-right"
            style={{ 
                width: `${width}px`,
                display: "flex",
                flexDirection: "column",
                height: "100%", }}>
             <MonthlyCalendar
                year={year}
                month={month}
                events={events}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
            />
            <div style={{ padding: 8, borderTop: "1px solid #333", borderBottom: "1px solid #333",fontSize: 12 }}>
                Selected date: {selectedDate ? selectedDate : "No date selected"}
            </div>
        </div>
    );
}
