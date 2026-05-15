import React, { useEffect, useState } from 'react';

export const DashboardHeader = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatDate = (d) => {
    const opts = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = d.toLocaleDateString(undefined, opts);
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  const dt = formatDate(now);

  return (
    <header className="dashboard-header">
      <div className="title">IncidentTrack</div>
      <div className="datetime">
        <div className="date">{dt.date}</div>
        <div className="time">{dt.time}</div>
      </div>
    </header>
  );
};

export default DashboardHeader;
