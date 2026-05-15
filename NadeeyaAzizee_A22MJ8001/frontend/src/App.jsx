import { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { UploadConsole } from './pages/UploadConsole';
import { ViewerPage } from './pages/ViewerPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import TagsGraph from './components/TagsGraph';
import './App.css';

export default function App() {
  const { user, isLoading, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentKey, setIncidentKey] = useState(0);
  const [tagsSummaryKey, setTagsSummaryKey] = useState(0);
  const bumpTagsSummary = useCallback(() => {
    setTagsSummaryKey((k) => k + 1);
  }, []);

  if (isLoading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!user) return <LoginPage onLogin={login} />;

  const handleSelectIncident = (incident) => {
    setSelectedIncident(incident);
    setCurrentPage('detail');
  };

  const handleUpdateIncident = (updatedIncident) => {
    setSelectedIncident(updatedIncident);
    setIncidentKey((prev) => prev + 1);
  };

  return (
    <div className="app layout-with-sidebar">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={logout} />

      <div className="main-area">
        <DashboardHeader />

        <div className="dashboard-grid">
          <TagsGraph refreshKey={tagsSummaryKey} />
        </div>

        <section className="list-section">
          {currentPage === 'upload' && (
            <UploadConsole user={user} onIncidentsChanged={bumpTagsSummary} />
          )}
          {currentPage === 'home' && (
            <ViewerPage
              user={user}
              onSelectIncident={handleSelectIncident}
              onIncidentsChanged={bumpTagsSummary}
            />
          )}
          {currentPage === 'detail' && selectedIncident && (
            <IncidentDetailPage
              key={incidentKey}
              incident={selectedIncident}
              onBack={() => setCurrentPage('home')}
              onUpdate={handleUpdateIncident}
            />
          )}
        </section>
      </div>
    </div>
  );
}
