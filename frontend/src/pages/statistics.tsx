import { useState, useMemo } from 'react';
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

  // --- 1. Mock Data สำหรับ Heatmap ---
  const heatmapData = useMemo<HeatmapData[]>(() => {
    if (viewMode === 'week') {
      return [
        { label: 'Mon', minutes: 45 }, { label: 'Tue', minutes: 130 },
        { label: 'Wed', minutes: 190 }, { label: 'Thu', minutes: 73 }, 
        { label: 'Fri', minutes: 0 }, { label: 'Sat', minutes: 210 }, // ลองกดวันศุกร์ (Fri) จะเห็นว่าไม่มีกราฟโชว์
        { label: 'Sun', minutes: 30 }
      ];
    }
    if (viewMode === 'month') {
      return Array.from({ length: 30 }, (_, i) => ({
        label: `${i + 1}`,
        minutes: (i * 27 + 15) % 220 
      }));
    }
    if (viewMode === 'year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((m, i) => ({ 
        label: m, 
        minutes: (i * 123 + 45) % 600 
      }));
    }
    return [];
  }, [viewMode]); 

  // --- 2. คำนวณ Summary ด้านบน ---
  const getDynamicSummary = () => {
    if (selectedDate === 'Today') {
      return {
        title: "Today's Focus",
        totalFocus: '2h 25m',
        completedTasks: 4,
        eggsHatched: 1,
        totalMinutes: 145
      };
    }

    const selectedItem = heatmapData.find(d => d.label === selectedDate);
    const mins = selectedItem ? selectedItem.minutes : 0;
    
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const timeString = h > 0 ? `${h}h ${m}m` : `${m}m`;

    return {
      title: `Stats for ${selectedDate}`,
      totalFocus: mins > 0 ? timeString : '0m', 
      completedTasks: Math.floor(mins / 30), 
      eggsHatched: Math.floor(mins / 60),
      totalMinutes: mins
    };
  };

  const summary = getDynamicSummary();

  // --- 3. 🌟 จำลองการกระจายหมวดหมู่แบบสมจริง (ไม่มีการ Hardcode 0%) ---
  const getDynamicCategories = () => {
    // 3.1 กรณีวันนั้นไม่ได้โฟกัสเลย (0 นาที) ให้โชว์หมวดหมู่ = 0 อย่างเป็นธรรมชาติ
    if (summary.totalMinutes === 0) {
      return [];
    }

    // หมวดหมู่ทั้งหมดที่มีในระบบ
    const allCategories = [
      { name: 'General', color: '#8884d8' },
      { name: 'Database', color: '#ffc658' },
      { name: 'AI', color: '#82ca9d' }
    ];

    // กรณีเลือก Today ให้โชว์ 2 หมวดหมู่แบบสวยๆ
    if (selectedDate === 'Today') {
      return [
        { ...allCategories[0], percent: 65 },
        { ...allCategories[1], percent: 35 }
      ];
    }

    // 3.2 สุ่มจำนวนหมวดหมู่ที่ทำในวันนั้น (ได้ 1, 2 หรือ 3 หมวดหมู่ อิงจากความยาวชื่อวัน)
    const categoryCount = (selectedDate.charCodeAt(0) + selectedDate.length) % 3 + 1;

    // สร้างข้อมูลกราฟตามจำนวนหมวดหมู่ที่สุ่มได้ (เปอร์เซ็นต์รวมกัน = 100%)
    if (categoryCount === 1) {
      // ทำแค่ 1 อย่างทั้งวัน (100%)
      return [
        { ...allCategories[0], percent: 100 }
      ];
    } else if (categoryCount === 2) {
      // ทำ 2 อย่าง (60% กับ 40%)
      return [
        { ...allCategories[0], percent: 60 },
        { ...allCategories[1], percent: 40 }
      ];
    } else {
      // ทำครบ 3 อย่าง (45%, 35%, 20%)
      return [
        { ...allCategories[0], percent: 45 },
        { ...allCategories[1], percent: 35 },
        { ...allCategories[2], percent: 20 }
      ];
    }
  };

  const categories = getDynamicCategories();

  // วาดกราฟวงกลม (ถ้าไม่มีหมวดหมู่เลย ให้แสดงเป็นวงแหวนสีเทา)
  let currentAngle = 0;
  const conicGradientString = categories.length > 0 
    ? categories.map(cat => {
        const start = currentAngle;
        const end = currentAngle + (cat.percent * 3.6); 
        currentAngle = end;
        return `${cat.color} ${start}deg ${end}deg`;
      }).join(', ')
    : '#ebf0e6 0deg 360deg'; // วงแหวนสีเทากรณีว่างเปล่า (0 นาที)

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

      <h3 style={{ margin: '0 0 15px 0', color: '#4a3320' }}>
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
          <h3 className="chart-title">Focus Heatmap ({viewMode})</h3>
          <div className={`heatmap-grid ${viewMode}`}>
            {heatmapData.map((data, index) => (
              <div 
                key={index} 
                className={`heatmap-item ${getHeatmapLevel(data.minutes)} ${selectedDate === data.label ? 'selected' : ''}`}
                onClick={() => setSelectedDate(data.label)}
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
                categories.map((cat, idx) => (
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