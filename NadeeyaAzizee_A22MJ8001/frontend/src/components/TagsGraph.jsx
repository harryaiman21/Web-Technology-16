import React, { useEffect, useMemo, useState } from 'react';
import { incidentsAPI } from '../utils/api';

const colorForTag = (tag) => {
  const s = String(tag || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue} 85% 55%)`;
};

export const TagsGraph = ({ refreshKey = 0 }) => {
  const [tagCounts, setTagCounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await incidentsAPI.getAll();
      const counts = new Map();

      for (const inc of res.data || []) {
        for (const t of inc.tags || []) {
          if (!t) continue;
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      }

      const rows = Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // keep chart readable

      setTagCounts(rows);
    } catch (e) {
      const msg = e?.message || 'Failed to load incidents';
      setError(msg);
      setTagCounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...tagCounts.map((x) => x.count));
  }, [tagCounts]);

  return (
    <div className="dept-graph card">
      <h4 className="card-title">Incidents Summary</h4>
      <div className="graph-period">
        Based on tags recorded
      </div>

      {isLoading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading...</div>
      ) : error ? (
        <div style={{ padding: 12 }}>
          <div style={{ color: 'var(--dhl-red)', fontWeight: 800, marginBottom: 8 }}>
            Couldn’t load incidents (chart is empty)
          </div>
          <div style={{ color: 'var(--muted)', marginBottom: 12 }}>
            {error}
          </div>
          <button className="secondary" onClick={load}>
            Retry
          </button>
        </div>
      ) : tagCounts.length === 0 ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>
          No tag data yet. Create an incident with tags, then click{' '}
          <button className="secondary" onClick={load} style={{ marginLeft: 6 }}>
            Refresh
          </button>
        </div>
      ) : (
        <div className="graph-canvas">
          {tagCounts.map((row) => {
            const heightPct = Math.round((row.count / maxCount) * 100);
            return (
              <div key={row.tag} className="graph-bar">
                <div className="bar-value">{row.count}</div>
                <div
                  className="bar-fill"
                  style={{ height: `${heightPct}%`, background: colorForTag(row.tag) }}
                  title={`${row.tag}: ${row.count}`}
                />
                <div className="bar-label">
                  {row.tag}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TagsGraph;
