import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan, faHouse, faClock } from '@fortawesome/free-regular-svg-icons';
import { faEgg } from '@fortawesome/free-solid-svg-icons';
import Focus from './Focus';
import '../home.css';
import '../select.css';

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

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'General', color: '#8884d8' },
    { id: '2', name: 'Database', color: '#ffc658' },
    { id: '3', name: 'AI', color: '#82ca9d' }
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Study for Exam', completed: false, categoryId: '1' },
    { id: '2', text: 'Workout 30 mins', completed: true, categoryId: '1' },
    { id: '3', text: 'Design ER Diagram', completed: false, categoryId: '2' },
  ]);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategoryId, setNewTaskCategoryId] = useState(categories[0]?.id || '');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#7fa65a');

  const [expandedCategories, setExpandedCategories] = useState<string[]>(categories.map(c => c.id));
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  const toggleCategoryDropdown = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat = {
      id: Date.now().toString(),
      name: newCategoryName,
      color: newCategoryColor
    };
    setCategories([...categories, newCat]);
    setNewTaskCategoryId(newCat.id);
    setNewCategoryName('');
    setNewCategoryColor('#7fa65a');
    setIsAddingNewCategory(false);
  };

  const saveTask = () => {
    if (!newTaskText.trim()) return;
    if (editingId) {
      setTasks(tasks.map(task => 
        task.id === editingId ? { ...task, text: newTaskText, categoryId: newTaskCategoryId } : task
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
    setActiveTab('select-egg'); 
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
            <FontAwesomeIcon icon={faHouse} /> Home
          </div>
          <div className={`nav-item ${['focus', 'select-egg', 'focus-timer'].includes(activeTab) ? 'active' : ''}`} onClick={() => setActiveTab('focus')}>
            <FontAwesomeIcon icon={faClock} /> Focus
          </div>
          <div className={`nav-item ${activeTab === 'collection' ? 'active' : ''}`} onClick={() => setActiveTab('collection')}>
            <FontAwesomeIcon icon={faEgg} /> Collection
          </div>
        </div>
      </div>

      {/* ----------------- MAIN CONTENT ----------------- */}
      <div className="main-content">
        
        {/* === HOME (Dashboard) === */}
        {activeTab === 'home' && (
          <>
            <div className="dashboard-header">
              <div className="welcome-text">
                <h1>Good morning, User!</h1>
                <p>Ready to focus and hatch today?</p>
              </div>
              <div className="stats-card">
                <div className="stat-item"><span className="stat-label">Focus Time</span><span className="stat-value">00 00m</span></div>
                <div className="stat-divider"></div>
                <div className="stat-item"><span className="stat-label">Tasks Done</span><span className="stat-value">0</span></div>
                <div className="stat-divider"></div>
                <div className="stat-item"><span className="stat-label">Eggs Hatched</span><span className="stat-value">0</span></div>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="empty-spacer"></div>
              <div className="card tasks-widget">
                <div className="card-header"><h2 className="card-title">Today's Tasks</h2></div>
                <button className="btn-todo" onClick={() => { setEditingId(null); setNewTaskText(''); setActiveTab('create-todo'); }}>
                  + New Todo
                </button>

                <div className="task-list">
                  {categories.map(category => {
                    const categoryTasks = tasks.filter(t => t.categoryId === category.id);
                    if (categoryTasks.length === 0) return null; 
                    const isExpanded = expandedCategories.includes(category.id);
                    return (
                      <div key={category.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div onClick={() => toggleCategoryDropdown(category.id)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '5px 0' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: category.color, marginRight: '10px' }}></span>
                          <span style={{ fontWeight: 'bold', color: '#4a3320', flex: 1, fontSize: '14px' }}>{category.name}</span>
                          <span style={{ color: '#8c735e', fontSize: '12px', marginRight: '10px' }}>{categoryTasks.length}</span>
                          <span style={{ color: '#8c735e', fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
                        </div>
                        {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
                            {categoryTasks.map(task => (
                              <div key={task.id} className="task-item" style={{ cursor: task.completed ? 'default' : 'pointer' }} onClick={() => handleTaskClickForFocus(task)}>
                                <div className="task-left">
                                  <div className={`task-checkbox ${task.completed ? 'completed' : ''}`} onClick={(e) => toggleTask(task.id, e)}>
                                    {task.completed && '✓'}
                                  </div>
                                  <span className={`task-text ${task.completed ? 'completed' : ''}`}>{task.text}</span>
                                </div>
                                <div className="task-actions">
                                  <button className="icon-btn" onClick={(e) => startEdit(task, e)}><FontAwesomeIcon icon={faPenToSquare} /></button>
                                  <button className="icon-btn" onClick={(e) => deleteTask(task.id, e)}><FontAwesomeIcon icon={faTrashCan} /></button>
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

              <div className="right-widgets">
                <div className="card log-widget" style={{ flex: 1 }}>
                  <div className="card-header"><h2 className="card-title">Recent Activity</h2></div>
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

        {/* === CREATE / EDIT TODO === */}
        {activeTab === 'create-todo' && (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: '100%' }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', marginTop: '20px', height: 'auto' }}>
              <div className="back-btn-wrapper" onClick={resetForm}>
                <div className="btn-back-circle">←</div>
                <span>Back to Dashboard</span>
              </div>
              <h2 className="card-title" style={{ fontSize: '24px', marginBottom: '25px' }}>{editingId ? 'Edit Todo' : 'Create New Todo'}</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320' }}>Task Title</label>
                <input type="text" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2d7c8', fontSize: '16px', outline: 'none' }} placeholder="What do you want to focus on?" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320', display: 'flex', justifyContent: 'space-between' }}>
                  Category
                  <span style={{ color: '#7fa65a', cursor: 'pointer', fontWeight: 'normal' }} onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}>
                    {isAddingNewCategory ? 'Cancel' : '+ New Category'}
                  </span>
                </label>

                {isAddingNewCategory ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="color" className="color-picker-input" value={newCategoryColor} onChange={(e) => setNewCategoryColor(e.target.value)} />
                    <input type="text" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid #e2d7c8', fontSize: '16px', outline: 'none' }} placeholder="Enter new category name..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    <button onClick={handleAddNewCategory} className="btn-add">Add</button>
                  </div>
                ) : (
                  <select value={newTaskCategoryId} onChange={(e) => setNewTaskCategoryId(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #e2d7c8', fontSize: '16px', outline: 'none', backgroundColor: 'white' }}>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <button onClick={saveTask} className="btn-save">{editingId ? 'UPDATE TASK' : 'SAVE & ADD TASK'}</button>
            </div>
          </div>
        )}

        {['focus', 'select-egg', 'focus-timer', 'collection'].includes(activeTab) && (
          <Focus 
            activeTab={activeTab === 'focus' ? 'select-egg' : activeTab} // บังคับให้เริ่มที่หน้าเลือกไข่ถ้ากดจากเมนู Focus
            setActiveTab={setActiveTab} 
            task={focusTask} 
          />
        )}

      </div>
    </div>
  );
}