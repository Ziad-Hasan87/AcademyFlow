import React, { useRef, useState, useEffect } from "react";

function SingleMonthCalendar({ year, month, events = [], onSelectDate, selectedDate }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Get today's date for comparison
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Calculate which week the selected date belongs to
  const getWeekOfMonth = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (y !== year || m !== month + 1) return null;
    
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay();
    
    // Calculate the row (week) in the calendar grid
    const dayIndex = d - 1;
    const weekRow = Math.floor((firstDay + dayIndex) / 7);
    
    return weekRow;
  };

  const selectedWeek = getWeekOfMonth(selectedDate);

  const cells = [];
  let currentWeek = -1;

  for (let i = 0; i < firstDay; i++) {
    if (i % 7 === 0) currentWeek++;
    const isWeekSelected = selectedWeek !== null && currentWeek === selectedWeek;
    cells.push(<div key={`empty-${i}`} className={isWeekSelected ? "week-selected" : ""} />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const totalIndex = firstDay + day - 1;
    currentWeek = Math.floor(totalIndex / 7);
    const isWeekSelected = selectedWeek !== null && currentWeek === selectedWeek;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = events.filter((e) => e.date === dateStr);
    const isSelected = selectedDate === dateStr;
    const isToday = dateStr === todayStr;

    cells.push(
      <div
        key={day}
        className={`calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${isWeekSelected ? "week-selected" : ""}`}
        onClick={() => onSelectDate?.(dateStr)}
      >
        <div className="day-number"> {day} </div>
        {dayEvents.slice(0, 2).map((e, i) => (
          <div key={i} className="day-event">
            {e.title}
          </div>
        ))}
        {dayEvents.length > 2 && (
          <div className="day-event"> +{dayEvents.length - 2} more </div>
        )}
      </div>
    );
  }

  return (
    <div className="single-month-calendar">
      <div className="calendar-weekdays">
        <div>Su</div>
        <div>Mo</div>
        <div>Tu</div>
        <div>We</div>
        <div>Th</div>
        <div>Fr</div>
        <div>Sa</div>
      </div>
      <div className="calendar-grid">{cells}</div>
    </div>
  );
}

export default function MonthlyCalendar({
  currentYear,
  currentMonth,
  events = [],
  onSelectDate,
  selectedDate,
  onMonthYearChange,
}) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Generate years from 2020 to 2030
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

  const scrollContainerRef = useRef(null);
  const isScrolling = useRef(false);

  // Get today's date formatted
  const today = new Date();
  const todayFormatted = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}`;

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    onMonthYearChange?.(currentYear, newMonth);
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    onMonthYearChange?.(newYear, currentMonth);
  };

  const goToPreviousMonth = () => {
    const prevMonth = currentMonth - 1;
    if (prevMonth < 0) {
      onMonthYearChange?.(currentYear - 1, 11);
    } else {
      onMonthYearChange?.(currentYear, prevMonth);
    }
  };

  const goToNextMonth = () => {
    const nextMonth = currentMonth + 1;
    if (nextMonth > 11) {
      onMonthYearChange?.(currentYear + 1, 0);
    } else {
      onMonthYearChange?.(currentYear, nextMonth);
    }
  };

  const handleWheel = (e) => {
    if (isScrolling.current) return;
    
    e.preventDefault();
    isScrolling.current = true;

    if (e.deltaY > 0) {
      goToNextMonth();
    } else {
      goToPreviousMonth();
    }

    // Debounce: prevent rapid scrolling
    setTimeout(() => {
      isScrolling.current = false;
    }, 300);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [currentYear, currentMonth]);

  return (
    <div className="monthly-calendar-container">
      <div className="calendar-controls">
        <div className="month-year-display">
          <div className="month-year-info">
            <span className="month-year-text">
              {months[currentMonth]} {currentYear}
            </span>
            <span className="today-date-small">{todayFormatted}</span>
          </div>
          <div className="nav-buttons">
            <button className="nav-button up" onClick={goToPreviousMonth}>▲</button>
            <button className="nav-button down" onClick={goToNextMonth}>▼</button>
          </div>
        </div>
      </div>

      <div className="calendar-scroll-container" ref={scrollContainerRef}>
        <SingleMonthCalendar
          year={currentYear}
          month={currentMonth}
          events={events}
          onSelectDate={onSelectDate}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}