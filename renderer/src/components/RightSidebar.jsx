import React, { useEffect, useState } from "react";
import MonthlyCalendar from "./MonthlyCalendar";
export default function RightSidebar({ width, setWeekRange }) {

    const today = new Date();
    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const [selectedDate, setSelectedDate] = useState(todayDateStr);

    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());

    const getWeekRange = (dateStr) => {

        if (!dateStr) return { startOfWeek: null, endOfWeek: null };

        const date = new Date(dateStr);
        const day = date.getDay();

        const start = new Date(date);
        start.setDate(date.getDate() - day);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const format = (d) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        return {
            startOfWeek: format(start),
            endOfWeek: format(end),
        };

    };

    useEffect(() => {

        const { startOfWeek, endOfWeek } = getWeekRange(todayDateStr);
        setWeekRange(startOfWeek, endOfWeek);

    }, []);

    const handleMonthYearChange = (year, month) => {
        setCurrentYear(year);
        setCurrentMonth(month);
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

        </div>
    );
}
