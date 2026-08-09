import { useState, useEffect } from 'react';
import '../home.css';
import '../select.css';
import '../focus.css';


// =========================================
// Interfaces (กำหนดประเภทข้อมูล)
// =========================================
interface Task {
  id: string;
  text: string;
  completed: boolean;
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Egg {
  id: string;
  name: string;
  tier: string;
  timeRequired: number;
  desc: string;
  animals: string[];
}

export default function Home() {
  // =========================================
  // States
  // =========================================
  const [activeTab, setActiveTab] = useState('home');

  // ข้อมูลหมวดหมู่
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'General', color: '#8884d8' },
    { id: '2', name: 'Database', color: '#ffc658' },
    { id: '3', name: 'AI', color: '#82ca9d' }
  ]);

  // ข้อมูล Tasks
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Study for Exam', completed: false, categoryId: '1' },
    { id: '2', text: 'Workout 30 mins', completed: true, categoryId: '1' },
    { id: '3', text: 'Design ER Diagram', completed: false, categoryId: '2' },
  ]);

  // ข้อมูลไข่ 3 ระดับ
  const eggs: Egg[] = [
    { id: 'common', name: 'Forest Egg', tier: 'Common', timeRequired: 60, desc: 'A mysterious egg from the forest. You might hatch something cute!', animals: ['🐻', '🦊', '🐺'] },
    { id: 'rare', name: 'Mountain Egg', tier: 'Rare', timeRequired: 120, desc: 'A sturdy egg found high in the mountains. Holds rare creatures.', animals: ['🦅', '🐐', '🐆'] },
    { id: 'epic', name: 'Golden Egg', tier: 'Epic', timeRequired: 240, desc: 'A glowing golden egg. Extremely rare and valuable.', animals: ['🐉', '🦄', '🦁'] }
  ];
  
  // State สำหรับฟอร์ม (สร้าง / แก้ไข Task)
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategoryId, setNewTaskCategoryId] = useState(categories[0]?.id || '');
  const [editingId, setEditingId] = useState<string | null>(null);

  // State สำหรับสร้าง Category ใหม่
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // State สำหรับ Dropdown Category ในหน้า Home
  const [expandedCategories, setExpandedCategories] = useState<string[]>(categories.map(c => c.id));
  
  // State สำหรับหน้าเลือกไข่
  const [selectedEggId, setSelectedEggId] = useState<string>('common');
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  // State สำหรับ Timer
  const [timeLeft, setTimeLeft] = useState(0); // เวลาที่เหลือ (วินาที)
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // =========================================
  // ระบบนับถอยหลัง Timer
  // =========================================
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      alert('Focus Session Completed! Your egg is ready to hatch! 🎉');
      setActiveTab('home'); 
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // =========================================
  // Functions จัดการ Task & Category
  // =========================================
  
  const toggleCategoryDropdown = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };
  
  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat = {
      id: Date.now().toString(),
      name: newCategoryName,
      color: '#7fa65a' 
    };
    setCategories([...categories, newCat]);
    setNewTaskCategoryId(newCat.id);
    setNewCategoryName('');
    setIsAddingNewCategory(false);
  };

  const saveTask = () => {
    if (!newTaskText.trim()) return;
    
    if (editingId) {
      setTasks(tasks.map(task => 
        task.id === editingId 
          ? { ...task, text: newTaskText, categoryId: newTaskCategoryId } 
          : task
      ));
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        text: newTaskText,
        completed: false,
        categoryId: newTaskCategoryId
      };
      setTasks([...tasks, newTask]);
    }
    resetForm();
  };

  const resetForm = () => {
    setNewTaskText('');
    setEditingId(null);
    setIsAddingNewCategory(false);
    setActiveTab('home');
  };

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(tasks.filter(task => task.id !== id));
  };

  const startEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(task.id);
    setNewTaskText(task.text);
    setNewTaskCategoryId(task.categoryId || categories[0].id);
    setActiveTab('create-todo');
  };

  const handleTaskClickForFocus = (task: Task) => {
    if (task.completed) return; 
    setFocusTask(task);
    setSelectedEggId('common'); 
    setActiveTab('select-egg');
  };

  // =========================================
  // Render
  // =========================================
  return (
    <div className="home-page">
      {/* ----------------- SIDEBAR ----------------- */}
      <div className="sidebar">
        <div className="logo-section">
          <img src="/images/logo.png" alt="Pomonest Logo" className="sidebar-logo" />
        </div>
        <div className="nav-menu">
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            🏠 Home
          </div>
          <div className={`nav-item ${activeTab === 'focus' ? 'active' : ''}`} onClick={() => setActiveTab('focus')}>
            ⏱️ Focus
          </div>
          <div className={`nav-item ${activeTab === 'collection' ? 'active' : ''}`} onClick={() => setActiveTab('collection')}>
            🐣 Collection
          </div>
        </div>
      </div>

      {/* ----------------- MAIN CONTENT ----------------- */}
      <div className="main-content">
        
        {/* === 1. หน้า HOME (Dashboard) === */}
        {activeTab === 'home' && (
          <>
            <div className="dashboard-header">
              <div className="welcome-text">
                <h1>Good morning, User! ☀️</h1>
                <p>Ready to focus and hatch today?</p>
              </div>
              
              <div className="stats-card">
                <div className="stat-item">
                  <span className="stat-label">Focus Time</span>
                  <span className="stat-value">00 00m</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-label">Tasks Done</span>
                  <span className="stat-value">0</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-label">Eggs Hatched</span>
                  <span className="stat-value">0</span>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              
              <div className="empty-spacer"></div>

              {/* คอลัมน์ 2: Today's Tasks */}
              <div className="card tasks-widget">
                <div className="card-header">
                  <h2 className="card-title">Today's Tasks</h2>
                </div>
                
                <button 
                  style={{ 
                    width: '100%', padding: '12px', marginBottom: '15px', 
                    backgroundColor: '#ded65a', color: '#4a3320', 
                    border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' 
                  }}
                  onClick={() => {
                    setEditingId(null);
                    setNewTaskText('');
                    setActiveTab('create-todo');
                  }}
                >
                  + New Todo
                </button>

                <div className="task-list">
                  {categories.map(category => {
                    const categoryTasks = tasks.filter(t => t.categoryId === category.id);
                    if (categoryTasks.length === 0) return null; 
                    
                    const isExpanded = expandedCategories.includes(category.id);

                    return (
                      <div key={category.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        <div 
                          onClick={() => toggleCategoryDropdown(category.id)}
                          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '5px 0' }}
                        >
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: category.color, marginRight: '10px' }}></span>
                          <span style={{ fontWeight: 'bold', color: '#4a3320', flex: 1, fontSize: '14px' }}>{category.name}</span>
                          <span style={{ color: '#8c735e', fontSize: '12px', marginRight: '10px' }}>{categoryTasks.length}</span>
                          <span style={{ color: '#8c735e', fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
                        </div>

                        {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
                            {categoryTasks.map(task => (
                              <div 
                                key={task.id} 
                                className="task-item" 
                                style={{ cursor: task.completed ? 'default' : 'pointer' }}
                                onClick={() => handleTaskClickForFocus(task)}
                              >
                                <div className="task-left">
                                  <div 
                                    className={`task-checkbox ${task.completed ? 'completed' : ''}`}
                                    onClick={(e) => toggleTask(task.id, e)}
                                  >
                                    {task.completed && '✓'}
                                  </div>
                                  <span className={`task-text ${task.completed ? 'completed' : ''}`}>
                                    {task.text}
                                  </span>
                                </div>
                                
                                <div className="task-actions">
                                  <button className="icon-btn" onClick={(e) => startEdit(task, e)}>✏️</button>
                                  <button className="icon-btn" onClick={(e) => deleteTask(task.id, e)}>🗑️</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* คอลัมน์ 3: Logs */}
              <div className="right-widgets">
                <div className="card log-widget" style={{ flex: 1 }}>
                  <div className="card-header">
                    <h2 className="card-title">Recent Activity</h2>
                  </div>
                  <div className="activity-list">
                    <div className="activity-item">
                      <div className="activity-icon">🐰</div>
                      <div className="activity-details">
                        <p className="activity-title">Hatched new animal!</p>
                        <p className="activity-desc">Fluffy Bunny</p>
                      </div>
                      <span className="activity-time">10m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* === 2. หน้า CREATE / EDIT TODO === */}
        {activeTab === 'create-todo' && (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: '100%' }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', marginTop: '20px', height: 'auto' }}>
              
              <button 
                onClick={resetForm} 
                style={{ background: 'none', border: 'none', color: '#8c735e', cursor: 'pointer', marginBottom: '20px', fontSize: '16px', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                ← Back to Dashboard
              </button>

              <h2 className="card-title" style={{ fontSize: '24px', marginBottom: '25px' }}>
                {editingId ? 'Edit Todo' : 'Create New Todo'}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320' }}>Task Title</label>
                <input 
                  type="text" 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2d7c8', fontSize: '16px', outline: 'none' }}
                  placeholder="What do you want to focus on?"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320', display: 'flex', justifyContent: 'space-between' }}>
                  Category
                  <span 
                    style={{ color: '#7fa65a', cursor: 'pointer', fontWeight: 'normal' }}
                    onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                  >
                    {isAddingNewCategory ? 'Cancel' : '+ New Category'}
                  </span>
                </label>

                {isAddingNewCategory ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2d7c8', fontSize: '16px', outline: 'none' }}
                      placeholder="Enter new category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button 
                      onClick={handleAddNewCategory} 
                      style={{ padding: '10px 20px', backgroundColor: '#7fa65a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select 
                    value={newTaskCategoryId}
                    onChange={(e) => setNewTaskCategoryId(e.target.value)}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2d7c8', fontSize: '16px', outline: 'none', backgroundColor: 'white' }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <button 
                onClick={saveTask} 
                style={{ width: '100%', padding: '15px', fontSize: '16px', backgroundColor: '#5c8442', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {editingId ? 'Update Task' : 'Save & Add Task'}
              </button>

            </div>
          </div>
        )}

        {/* === 3. หน้า SELECT EGG === */}
        {activeTab === 'select-egg' && (
          <div className="select-egg-view">
             <div className="egg-header">
                <button className="back-btn" onClick={() => setActiveTab('home')}>←</button>
                <div>
                  <h2>Select an Egg</h2>
                  <p>Choose an egg to hatch with your focus time for: <strong>{focusTask?.text}</strong></p>
                </div>
             </div>

             <div className="egg-content-wrapper">
                
                {/* Left: กล่องการ์ดไข่ */}
                <div className="egg-cards-container">
                  {eggs.map(egg => (
                    <div 
                      key={egg.id}
                      className={`egg-card ${selectedEggId === egg.id ? 'active' : ''}`}
                      onClick={() => setSelectedEggId(egg.id)}
                    >
                      <div className="egg-image-placeholder">
                        {egg.tier === 'Common' ? '🥚' : egg.tier === 'Rare' ? '🪨' : '✨'}
                      </div>
                      <h3>{egg.name}</h3>
                      <p className="egg-tier">{egg.tier} Tier</p>
                      <p className="egg-time">{egg.timeRequired} min required</p>
                      
                      <div className="egg-progress-bg">
                         <div className="egg-progress-fill" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: ข้อมูลไข่และปุ่ม Start Focus */}
                <div className="egg-info-panel">
                   {(() => {
                     const currentEgg = eggs.find(e => e.id === selectedEggId)!;
                     return (
                       <>
                         <h3>About {currentEgg.name}</h3>
                         <p className="egg-desc">{currentEgg.desc}</p>
                         
                         <h4>Possible Animals</h4>
                         <div className="animal-icons-row">
                           {currentEgg.animals.map((emoji, i) => (
                             <div key={i} className="animal-icon">{emoji}</div>
                           ))}
                           <div className="animal-icon mystery">?</div>
                         </div>

                         <button 
                            className="btn-start-focus"
                            onClick={() => {
                              setTimeLeft(currentEgg.timeRequired * 60);
                              setIsTimerRunning(true);
                              setActiveTab('focus-timer'); 
                            }}
                         >
                            Start Focus
                         </button>
                       </>
                     )
                   })()}
                </div>
             </div>
          </div>
        )}

        {/* === 4. หน้า FOCUS TIMER (กำลังจับเวลา) === */}
        {activeTab === 'focus-timer' && (
          <div className="focus-timer-view">
            <div className="timer-background"></div>

            <div className="timer-top-bar">
              <button className="btn-outline-white" onClick={() => { setIsTimerRunning(false); setActiveTab('home'); }}>
                ⏴ End Session
              </button>
              <span className="timer-title">Focus Session</span>
              <div className="timer-controls">
                <button className="icon-btn-white">🔊</button>
                <button className="icon-btn-white">⚙️</button>
              </div>
            </div>

            <div className="timer-center-display">
              <h1 className="countdown-text">{formatTime(timeLeft)}</h1>
              <p className="focus-task-name">{focusTask?.text}</p>
              
              {(() => {
                const totalSeconds = (eggs.find(e => e.id === selectedEggId)?.timeRequired || 60) * 60;
                const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
                
                let stage = 1;
                if (progress >= 75) stage = 4;
                else if (progress >= 50) stage = 3;
                else if (progress >= 25) stage = 2;

                return (
                  <div className="nest-container">
                    <img src="/images/nest.png" alt="Nest" className="nest-img" />
                    <img 
                      src={`/images/egg-${selectedEggId}-stage${stage}.png`} 
                      alt={`Egg Stage ${stage}`} 
                      className={`egg-img ${isTimerRunning ? 'rocking-anim' : ''}`} 
                    />
                  </div>
                );
              })()}
            </div>

            <div className="timer-bottom-controls">
              <div className="egg-status-card">
                <span className="egg-mini-icon">🥚</span>
                <div className="egg-status-info">
                  <span className="egg-name">{eggs.find(e => e.id === selectedEggId)?.name}</span>
                  <div className="egg-progress-mini-bg">
                    <div 
                      className="egg-progress-mini-fill" 
                      style={{ 
                        width: `${(((eggs.find(e => e.id === selectedEggId)?.timeRequired || 60) * 60 - timeLeft) / ((eggs.find(e => e.id === selectedEggId)?.timeRequired || 60) * 60)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <span className="egg-tier-tag">{eggs.find(e => e.id === selectedEggId)?.tier}</span>
              </div>

              <div className="action-buttons">
                <button className="btn-action pause" onClick={() => setIsTimerRunning(!isTimerRunning)}>
                  {isTimerRunning ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button className="btn-action end" onClick={() => { setIsTimerRunning(false); setActiveTab('home'); }}>
                  ⏹ End Session
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}