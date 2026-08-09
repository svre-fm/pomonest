import { useState } from 'react';
import '../home.css';

// ประเภทข้อมูลสำหรับ Task
interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export default function Home() {
  // สถานะจำลองสำหรับเมนู
  const [activeTab, setActiveTab] = useState('home');

  // ข้อมูล Tasks (เริ่มต้นมีจำลองไว้ให้ดู)
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Study for Exam', completed: false },
    { id: '2', text: 'Workout 30 mins', completed: true },
  ]);
  
  const [newTaskText, setNewTaskText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // ฟังก์ชันจัดการ Task
  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false,
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  const saveEdit = () => {
    setTasks(tasks.map(task => 
      task.id === editingId ? { ...task, text: editText } : task
    ));
    setEditingId(null);
  };

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
        
        {/* Header ทักทาย และ สถิติ */}
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
          
          {/* คอลัมน์ 1: ทำให้เห็นภาพพื้นหลัง */}
          <div className="empty-spacer"></div>

          {/* คอลัมน์ 2: Today's Tasks */}
          <div className="card tasks-widget">
            <div className="card-header">
              <h2 className="card-title">Today's Tasks</h2>
            </div>
            
            <div className="task-input-container">
              <input 
                type="text" 
                className="task-input" 
                placeholder="What do you need to do?"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <button className="add-btn" onClick={addTask}>+ Add</button>
            </div>

            <div className="task-list">
              {tasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-left">
                    <div 
                      className={`task-checkbox ${task.completed ? 'completed' : ''}`}
                      onClick={() => toggleTask(task.id)}
                    >
                      {task.completed && '✓'}
                    </div>

                    {editingId === task.id ? (
                      <input 
                        type="text" 
                        className="task-input" 
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={saveEdit}
                        onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                        autoFocus
                      />
                    ) : (
                      <span className={`task-text ${task.completed ? 'completed' : ''}`}>
                        {task.text}
                      </span>
                    )}
                  </div>
                  
                  <div className="task-actions">
                    <button className="icon-btn" onClick={() => startEdit(task)}>✏️</button>
                    <button className="icon-btn" onClick={() => deleteTask(task.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* คอลัมน์ 3: Logs */}
          <div className="right-widgets">
            
            {/* กล่อง Recent Activity */}
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
                
                <div className="activity-item">
                  <div className="activity-icon">⏱️</div>
                  <div className="activity-details">
                    <p className="activity-title">Focus completed</p>
                    <p className="activity-desc">30 minutes</p>
                  </div>
                  <span className="activity-time">1h ago</span>
                </div>

                <div className="activity-item">
                  <div className="activity-icon">✅</div>
                  <div className="activity-details">
                    <p className="activity-title">Task completed</p>
                    <p className="activity-desc">Read a book</p>
                  </div>
                  <span className="activity-time">3h ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}