# Frontend Setup Guide

## Overview

The frontend is built with **React + Vite**, providing a modern, fast development experience.

## Installation

### Prerequisites
- Node.js >= 14.x
- npm >= 6.x

### Steps

1. **Navigate to frontend folder**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

Expected output:
```
added 100+ packages in 3.5s
```

3. **Start development server**
```bash
npm run dev
```

Expected output:
```
VITE v5.0.0  ready in 234 ms

➜  Local:   http://localhost:3001/
```

4. **Open in browser**
```
http://localhost:3001
```

## Project Structure

```
frontend/
├── src/
│   ├── pages/              # Page components
│   │   ├── LoginPage.jsx           # Authentication
│   │   ├── UploadConsole.jsx       # Create incidents
│   │   ├── ViewerPage.jsx          # List & filter
│   │   └── IncidentDetailPage.jsx  # View/edit
│   ├── hooks/              # Custom React hooks
│   │   └── useAuth.js              # Auth hook
│   ├── utils/              # Utilities
│   │   └── api.js                  # API client
│   ├── App.jsx             # Main component
│   ├── App.css             # App styles
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies
└── README.md               # This file
```

## Component Guide

### LoginPage
```jsx
<LoginPage onLogin={(username) => {
  // Handle login
  // Stores user in localStorage
}} />
```

**Features**:
- Simple username input
- Demo credentials: admin, john.doe
- Stores user state in localStorage
- Auto-logout on page refresh

### UploadConsole
```jsx
<UploadConsole user={user} />
```

**Features**:
- Create new incidents
- Title, description, tags input
- File attachment support
- Duplicate detection (MD5 hash)
- Real-time validation
- Auto-save as Draft

### ViewerPage
```jsx
<ViewerPage onSelectIncident={(incident) => {
  // Handle selection
  // Navigate to detail page
}} />
```

**Features**:
- List all incidents in table
- Real-time search
- Filter by status or tags
- Sort by date/creator
- Refresh data from API
- Responsive table design

### IncidentDetailPage
```jsx
<IncidentDetailPage
  incident={selectedIncident}
  onBack={() => setCurrentPage('viewer')}
  onUpdate={(updated) => setIncident(updated)}
/>
```

**Features**:
- View full incident details
- Edit description
- Change status (Draft → Reviewed → Published)
- View status history
- Download attachments
- Display metadata (creator, date, hash)

## Styling

### Using Inline Styles

All components use inline styles for simplicity:

```jsx
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

<div style={styles.container}>
  <button style={styles.button}>Click Me</button>
</div>
```

### CSS Files

- `index.css` - Global styles
- `App.css` - Navigation and layout
- Component-specific styles in inline objects

### Customizing Styles

1. **Update color scheme**
   ```jsx
   // App.css
   .navbar {
     background-color: #2c3e50;  
   }
   ```

2. **Update button styles**
   ```jsx
   // pages/UploadConsole.jsx
   button: {
     backgroundColor: '#28a745',  
   }
   ```

3. **Update spacing**
   ```jsx
   container: {
     padding: '30px',  
     margin: '20px 0'  
   }
   ```

## API Integration

### API Client (utils/api.js)

```javascript
import { incidentsAPI, generateHash, checkDuplicates } from '../utils/api';

// Get all incidents
const response = await incidentsAPI.getAll();

// Create incident
await incidentsAPI.create({
  title: 'New Incident',
  description: '...',
  ...
});

// Update incident
await incidentsAPI.update(id, { status: 'Reviewed' });

// Delete incident
await incidentsAPI.delete(id);

// Generate hash
const hash = generateHash('content');

// Check for duplicates
const duplicates = await checkDuplicates(hash);
```

### Custom Fetch

```javascript
// Direct API call
const response = await fetch('http://localhost:3000/incidents')
  .then(r => r.json());

// With error handling
try {
  const response = await api.get('/incidents');
  console.log(response.data);
} catch (error) {
  console.error('Failed to fetch:', error);
}
```

## Environment Variables

Create `.env` file in frontend directory:

```bash
# .env
VITE_API_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:3000
```

Access in code:

```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Building for Production

```bash
npm run build
```

Output: `dist/`. Preview locally:

```bash
npm run preview
```

Point `VITE_API_URL` (or the default proxy) at your running backend when you serve `dist/`.

## Testing

### Manual Testing Checklist

- [ ] Login with username
- [ ] Navigate to Upload page
- [ ] Create new incident with file
- [ ] Search incidents by title
- [ ] Filter by status
- [ ] Filter by tags
- [ ] View incident details
- [ ] Edit incident
- [ ] Change status
- [ ] View history
- [ ] Logout

### Debugging

1. **Browser Console**
   ```javascript
   // Check for errors
   // View API responses
   console.log('API Response:', response);
   ```

2. **React DevTools**
   - Install React DevTools extension
   - Inspect component state
   - Check props

3. **Network Tab**
   - View API requests
   - Check response status
   - Verify headers

### Common Issues

**Issue**: "Cannot read property 'map' of undefined"

**Solution**: Add null checks
```jsx
{incidents?.map(i => <div>{i.title}</div>)}
```

**Issue**: "API returns 404"

**Solution**: Verify JSON Server is running
```bash
curl http://localhost:3000/incidents
```

**Issue**: Styles not applying

**Solution**: Check inline style syntax
```jsx
style="padding: 20px"
style={{ padding: '20px' }}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Vite Server Won't Start

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### API Requests Failing

```bash
# Check if JSON Server is running
curl http://localhost:3000

# Update API URL in utils/api.js
const API_BASE_URL = 'http://localhost:3000';
```

### Build Size Too Large

```bash
# Analyze bundle
npm run build -- --stats

# Remove unused dependencies
npm prune
```

## Resources

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Axios Docs](https://axios-http.com)
- [MDN Web Docs](https://developer.mozilla.org)
