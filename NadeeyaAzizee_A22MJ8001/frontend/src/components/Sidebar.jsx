import React from 'react';

export const Sidebar = ({ currentPage, setCurrentPage, onLogout }) => {
  return (
    <aside className="site-sidebar">
      <div className="sidebar-top">
        <div className="sidebar-user">Hi User!</div>
      </div>

      <nav className="sidebar-nav">
        <button className={`sb-btn ${currentPage==='home'?'active':''}`} onClick={() => setCurrentPage('home')}>Home Page</button>
        <button className={`sb-btn ${currentPage==='upload'?'active':''}`} onClick={() => setCurrentPage('upload')}>Upload Incident</button>
      </nav>

      <div className="sidebar-logout">
        <button className="logout-btn" onClick={onLogout}>Log Out</button>
      </div>
    </aside>
  );
};

export default Sidebar;
