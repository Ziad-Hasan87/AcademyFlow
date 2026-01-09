import React, { isValidElement } from "react";

export default function MonthlyCalendar({year, month, events=[], onSelectDate, selectedDate}){

  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  const cells = [];
  
  for(let i = 0;i < firstDay; i++){
    cells.push(<div key = {`empty-${i}`}/>);
  }

  for(let day = 1; day <= daysInMonth; day++){
    const dateStr = `${year} - ${String(month+1).padStart(2,"0")} - ${String(day).padStart(2, "0")}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    const isSelected = selectedDate === dateStr;

    cells.push(
      <div key={day} className={`calendar-day ${isSelected ?  "selected" : ""}`} onClick={()=> onSelectDate?.(dateStr)}>
        <div className="day-number"> {day} </div>
        {
          dayEvents.slice(0,2).map((e,i) =>(
            <div key={i} className="day-event">{e.title}</div>
          ))
        }
        {
          dayEvents.length > 2 && (
            <div className="day-event"> +{dayEvents.length-2} more </div>
          )
        }
      </div>
    );
  }
  
  return (
    <div className="monthly-calendar">
      <h3 className="calendar header">
        {new Date(year, month).toLocaleString("default", {month: "long", year: "numeric"})}
      </h3>
      <div className="calendar-grid">{cells}</div>
    </div>
  )
}