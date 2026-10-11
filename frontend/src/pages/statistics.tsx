import { useState, useEffect } from 'react';
import '../statistics.css';

type ViewMode = 'week' | 'month' | 'year'; 

interface HeatmapData {
  label: string; 
  minutes: number;
}

const getHeatmapLevel = (minutes: number) => {
  if (minutes === 0) return 'level-0';
  if (minutes < 60) return 'level-1'; 
  if (minutes < 120) return 'level-2'; 
  if (minutes < 180) return 'level-3'; 
  return 'level-4'; 
};

export default function Statistics() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<string>('Today');
  
  // State สำหรับเก็บข้อมูลจริงจาก Backend
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ดึงข้อมูลเมื่อ component แสดงผล หรือ viewMode เปลี่ยน
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // ดึง Token ของ User ที่ล็อกอินอยู่
        const token = localStorage.getItem('authToken'); 
        
        // แนบ Token ไปกับ Headers
        const res = await fetch(`/api/statistics?mode=${viewMode}&date=${selectedDate}`, {
          method: 'GET',
          cache: 'no-store', // บังคับไม่ให้เบราว์เซอร์จำข้อมูลเก่า
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await res.json();
        setStatsData(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [viewMode, selectedDate]);

  // หน้าจอระหว่างรอโหลดข้อมูล
  if (isLoading || !statsData) {
    return (
      <div className="statistics-view">
        <div className="stats-header">
          <h2>Statistics</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  // ดึงข้อมูลจริงจาก State มาใช้
  const heatmapData = statsData.heatmap || [];
  const summary = statsData.summary || { 
    title: `Stats for ${selectedDate}`, 
    totalFocus: '0m', 
    completedTasks: 0, 
    eggsHatched: 0, 
    totalMinutes: 0 
  };
  const categories = statsData.categories || [];

  // วาดสถิติกราฟวงกลม
  let currentAngle = 0;
  const conicGradientString = categories.length > 0 
    ? categories.map((cat: any) => {
        const start = currentAngle;
        const end = currentAngle + (cat.percent * 3.6); 
        currentAngle = end;
        return `${cat.color} ${start}deg ${end}deg`;
      }).join(', ')
    : '#ebf0e6 0deg 360deg'; 

  return (
    <div className="statistics-view">
      
      <div className="stats-header">
        <h2>Statistics</h2>
        <div className="toggle-group">
          {(['week', 'month', 'year'] as ViewMode[]).map(mode => (
            <button 
              key={mode} 
              className={`toggle-btn ${viewMode === mode ? 'active' : ''}`}
              onClick={() => {
                setViewMode(mode);
                setSelectedDate('Today'); 
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <h3 style={{ margin: '0 0 15px 0', color: '#4a3320', fontSize: '18px' }}>
        {summary.title}
      </h3>

      <div className="summary-cards-container">
        <div className="summary-card">
          <span className="label">Total Focus</span>
          <span className="value">{summary.totalFocus}</span>
        </div>
        <div className="summary-card">
          <span className="label">Completed Tasks</span>
          <span className="value">{summary.completedTasks}</span>
        </div>
        <div className="summary-card">
          <span className="label">Eggs Hatched</span>
          <span className="value">{summary.eggsHatched}</span>
        </div>
      </div>

      <div className="charts-container">
        
        <div className="chart-card" style={{ flex: 1.5 }}>
          <h3 className="chart-title">Category Heatmap ({viewMode})</h3>
          <div className={`heatmap-grid ${viewMode}`}>
            {heatmapData.map((data: HeatmapData, index: number) => (
              <div 
                key={index} 
                className={`heatmap-item ${getHeatmapLevel(data.minutes)}`}
              >
                <span className="heatmap-label">{data.label}</span>
                <span className="heatmap-value">{data.minutes}m</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card" style={{ flex: 1 }}>
          <h3 className="chart-title">Time by Category</h3>
          <div className="donut-chart-wrapper">
            <div className="donut-chart" style={{ background: `conic-gradient(${conicGradientString})`, transition: 'background 0.3s' }}>
              <div className="donut-hole"></div>
            </div>
            
            <div className="donut-legend">
              {categories.length > 0 ? (
                categories.map((cat: any, idx: number) => (
                  <div key={idx} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: cat.color }}></div>
                    <span>{cat.name}</span>
                    <span className="legend-percent">{cat.percent}%</span>
                  </div>
                ))
              ) : (
                <span style={{ color: '#8c735e', fontSize: '13px' }}>No focus data for this date</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}