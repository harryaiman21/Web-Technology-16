import { useState } from 'react';

export const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.trim().length === 0) {
      setError('Username is required');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onLogin(username);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>Incident Reporting System</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter your username"
              style={styles.input}
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={{ ...styles.button, opacity: isLoading ? 0.65 : 1 }} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={styles.info}>Demo credentials: admin, john.doe</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'transparent',
    padding: '24px',
  },
  loginBox: {
    backgroundColor: 'var(--surface)',
    padding: '40px',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: '30px',
    color: 'var(--ink)',
    letterSpacing: '0.2px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: 'var(--muted)',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  button: {
    padding: '10px',
    backgroundColor: 'var(--dhl-red)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 10px 20px rgba(212, 5, 17, 0.20)',
  },
  error: {
    color: 'var(--dhl-red)',
    fontSize: '14px',
    marginBottom: '10px',
  },
  info: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '12px',
    color: 'var(--muted)',
  },
};
