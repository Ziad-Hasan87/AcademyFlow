import React, { useEffect, useState } from "react";
import MonthlyCalendar from "./MonthlyCalendar";
import DailyEvents from "./DailyEvents";

export default function RightSidebar({ width, setWeekRange, selectedDate, onSelectedDateChange }) {

    const today = new Date();
    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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
        if (!selectedDate) {
            onSelectedDateChange?.(todayDateStr);
            setWeekRange(startOfWeek, endOfWeek);
        }

    }, [selectedDate, onSelectedDateChange, setWeekRange, todayDateStr]);

    const handleMonthYearChange = (year, month) => {
        setCurrentYear(year);
        setCurrentMonth(month);
    };
    const handleDateSelect = (date, startOfWeek, endOfWeek) => {
        onSelectedDateChange?.(date);
        setWeekRange(startOfWeek, endOfWeek);
        console.log("Selected date:", date);
        console.log("Week range:", startOfWeek, "to", endOfWeek);
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

            <DailyEvents selectedDate={selectedDate} />

        </div>
    );
}
