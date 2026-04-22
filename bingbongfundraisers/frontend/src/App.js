import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);
  const [helloCount, setHelloCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [healthResponse, helloResponse] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/hello'),
        ]);

        if (!healthResponse.ok) {
          throw new Error(`Health request failed: ${healthResponse.status}`);
        }
        if (!helloResponse.ok) {
          throw new Error(`Hello request failed: ${helloResponse.status}`);
        }

        const healthData = await healthResponse.json();
        const helloData = await helloResponse.json();
        setHealth(healthData);
        setHelloCount(helloData.count || 0);
      } catch (err) {
        setError(err.message || 'Unable to reach backend');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleHelloClick = async () => {
    try {
      const response = await fetch('/api/hello/click', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Click request failed: ${response.status}`);
      }
      const data = await response.json();
      setHelloCount(data.count || 0);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to update count');
    }
  };

  return (
    <main className="app">
      <h1>BingBong Fundraisers</h1>
      <p>Frontend is running.</p>
      {loading && <p>Checking backend health...</p>}
      {!loading && error && <p className="error">Backend error: {error}</p>}
      {!loading && health && (
        <p className="ok">
          Backend status: {health.status} ({health.service})
        </p>
      )}
      <button type="button" onClick={handleHelloClick} className="hello-button">
        Hello World ({helloCount})
      </button>
    </main>
  );
}

export default App;
