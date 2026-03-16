import React, { useEffect, useState } from "react";
import MonthlyCalendar from "./MonthlyCalendar";
import supabase from "../utils/supabase";
import EditEvent from "./EditEvent";
export default function RightSidebar({ width, selectedEvent, setWeekRange }) {

    const [selectedDate, setSelectedDate] = useState(null);

    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());

    const [editableEvent, setEditableEvent] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleMonthYearChange = (year, month) => {
        setCurrentYear(year);
        setCurrentMonth(month);
    };

    const updateField = (field, value) => {
        setEditableEvent(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        setEditableEvent(null);
    };
    const handleDateSelect = (date, startOfWeek, endOfWeek) => {

        if (selectedDate === date) {
            setSelectedDate(null);
            setWeekRange(null, null);
        } else {
            setSelectedDate(date);
            setWeekRange(startOfWeek, endOfWeek);
            console.log("Selected date:", date);
            console.log("Week range:", startOfWeek, "to", endOfWeek);
        }
    };
    useEffect(() => {
        if (selectedEvent) {
            setEditableEvent({ ...selectedEvent });
        } else {
            setEditableEvent(null);
        }
    }, [selectedEvent]);

    return (
        <div
            className="sidebar-right"
            style={{
                width: `${width}px`,
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            <MonthlyCalendar
                currentYear={currentYear}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                onMonthYearChange={handleMonthYearChange}
            />

            <div style={{ padding: 8, borderTop: "1px solid #333", borderBottom: "1px solid #333", fontSize: 12 }}>
                Selected date: {selectedDate ? selectedDate : "No date selected"}
            </div>

            <div className="right-sidebar-scroll">
                {editableEvent && (
                    <EditEvent
                        event={editableEvent}
                        onChange={updateField}
                        onSave={handleSave}
                        isSaving={isSaving}
                    />
                )}
            </div>
        </div>
    );
}
