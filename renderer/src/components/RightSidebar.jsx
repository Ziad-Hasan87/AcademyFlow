import React, {useState} from "react";
import MonthlyCalendar from "./MonthlyCalendar";

export default function RightSidebar({ width }) {

    const [selectedDate, setSelectedDate] = useState(null);
    
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());

    const events = [
        { date: "2026-01-10", title: "Meeting" },
        { date: "2026-01-15", title: "Project Due" },
        { date: "2026-01-19", title: "Call" },
    ];

    const handleMonthYearChange = (year, month) => {
        setCurrentYear(year);
        setCurrentMonth(month);
    };

    const handleDateSelect = (date) => {
        // Toggle: if clicking the same date, unselect it
        if (selectedDate === date) {
            setSelectedDate(null);
        } else {
            setSelectedDate(date);
        }
    };

    return (
        <div 
            className="sidebar-right"
            style={{ 
                width: `${width}px`,
                display: "flex",
                flexDirection: "column",
                height: "100%", }}>
             <MonthlyCalendar
                currentYear={currentYear}
                currentMonth={currentMonth}
                events={events}
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                onMonthYearChange={handleMonthYearChange}
            />
            <div style={{ padding: 8, borderTop: "1px solid #333", borderBottom: "1px solid #333",fontSize: 12 }}>
                Selected date: {selectedDate ? selectedDate : "No date selected"}
            </div>
        </div>
    );
}
