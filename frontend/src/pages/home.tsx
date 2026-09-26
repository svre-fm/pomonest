import { useEffect, useState, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan, faHouse, faClock,   } from '@fortawesome/free-regular-svg-icons';
import { faEgg, faDoorOpen, faGear, faCaretDown } from '@fortawesome/free-solid-svg-icons';
// import Focus from './Focus';
import '../home.css';
import '../select.css';
import CreateTodo from './createtodo';

interface TaskResponse {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  title: string;
  status: 'todo' | 'doing' | 'done';
  dueDate: string | null;
  completedAt: string | null;
}

interface CategoryResponse {
  id: string;
  userId: string;
  name: string;
  color: string;
}

interface OwnedAnimal {
  name: string;
  image: string;      
  animation: string;  
}

type Task = Pick<TaskResponse, 'id' | 'title' | 'status' | 'categoryId' | 'dueDate' >;
type Category = Pick<CategoryResponse, 'id' | 'name' | 'color'>;

const isTaskCompleted = (task: Task) => task.status === 'done';

const authFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};

const ANIMAL_LAYOUT: Record<string, { className: string; shadow: string | null }> = {
  Dog:     { className: 'dog',     shadow: 'shadow-dog' },
  Cat:     { className: 'cat',     shadow: 'shadow-cat' },
  Fish:    { className: 'fish',    shadow: null },
  Kid:     { className: 'kid',     shadow: 'kid-shadow' },
  Panda:   { className: 'panda',   shadow: 'panda-shadow' },
  Penguin: { className: 'penguin', shadow: 'penguin-shadow' },
  Rabbit:  { className: 'rabbit',  shadow: null },
  Tiger:   { className: 'tiger',   shadow: 'tiger-shadow' },
  Pig:     { className: 'pig',     shadow: 'pig-shadow' },
};

const ASSET_BASE_URL = '/images/animal';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');

  const [user, setUser] = useState<{
    email: string;
    username: string;
    avatar?: string;
  } | null>(null);

  // data user
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('authToken');

      if (!token) {
        console.log('No auth token');
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch user');
        }

        console.log('Current user:', result.data);
        setUser(result.data);
      } catch (error) {
        console.error('Fetch user error:', error);
      }
    };

    fetchUser();
  }, []);

  //animal of user
  const [ownedAnimals, setOwnedAnimals] = useState<OwnedAnimal[]>([]);

  useEffect(() => {
    const fetchOwnedAnimals = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const response = await fetch('/api/user-animals', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || result.message || 'Failed to fetch owned animals');
        }

        setOwnedAnimals(result.data);
      } catch (error) {
        console.error('Fetch owned animals error:', error);
      }
    };

    fetchOwnedAnimals();
  }, []);

  //size room
  const roomRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const updateRoomScale = useCallback(() => {
    if (!roomRef.current || !worldRef.current) return;

    const roomWidth = roomRef.current.clientWidth;
    const roomHeight = roomRef.current.clientHeight;

    const scale = Math.min(roomWidth / 1440, roomHeight / 810);

    worldRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateRoomScale);
    return () => {
      window.removeEventListener("resize", updateRoomScale);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'home') return;
    updateRoomScale();
  }, [activeTab, updateRoomScale]);

  // logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');

    window.location.href = '/login';
  };

  // dropdown logout
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // time
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskCategoryId, setNewTaskCategoryId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#7fa65a');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);


  //dropdown select categoty
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const selectedCategory = categories.find(c => c.id === newTaskCategoryId);
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  // const [focusTask, setFocusTask] = useState<Task | null>(null);

  //fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await authFetch('/api/categories');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch categories');
        setCategories(result.data);
      } catch (error) {
        console.error('Fetch categories error:', error);
      }
    };
    fetchCategories();
  }, []);
  
  //fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await authFetch('/api/tasks');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch tasks');

        const rawTasks: TaskResponse[] = result.data;
        setTasks(
          rawTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate,
            categoryId: t.categoryId,
          }))
        );
      } catch (error) {
        console.error('Fetch tasks error:', error);
      }
    };
    fetchTasks();
  }, []);

  // set defult dropdown task
  useEffect(() => {
    setExpandedCategories(categories.map((c) => c.id));
  }, [categories]);

  const toggleCategoryDropdown = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };
  
  //add new cotegory
  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      if (editingCategoryId) {
        const response = await authFetch(`/api/categories/${editingCategoryId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update category');

        const updated: Category = result.data;
        setCategories(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
      } else {
        const response = await authFetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create category');

        const newCat: Category = result.data;
        setCategories(prev => [...prev, newCat]);
        setNewTaskCategoryId(newCat.id);
      }

      setNewCategoryName('');
      setNewCategoryColor('#7fa65a');
      setIsAddingNewCategory(false);
      setEditingCategoryId(null);
    } catch (error) {
      console.error('Save category error:', error);
      alert(error instanceof Error ? error.message : 'Failed to save category');
    }
  };

  //edit category
  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
    setIsAddingNewCategory(true);
  };

  //delete category
  const handleDeleteCategory = async (categoryId: string) => {
    const previousCategories = categories;
    const previousTasks = tasks;

    setCategories(prev => prev.filter(c => c.id !== categoryId));

    setTasks(prev => prev.map(t => t.categoryId === categoryId ? { ...t, categoryId: null } : t));

    if (newTaskCategoryId === categoryId) {
      setNewTaskCategoryId('');
    }

    try {
      const response = await authFetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Delete category error:', error);
      setCategories(previousCategories);
      setTasks(previousTasks);
    }
  };
  
  //edit or add new tesk
  const saveTask = async () => {
    if (!newTaskText.trim()) return;
    try {
      if (editingId) {
        const response = await authFetch(`/api/tasks/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ title: newTaskText, dueDate: newTaskDate, categoryId: newTaskCategoryId }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update task');

        const updated: TaskResponse = result.data;
        setTasks(prev => prev.map(task =>
          task.id === editingId
            ? { id: updated.id, title: updated.title, status: updated.status, dueDate: updated.dueDate, categoryId: updated.categoryId }
            : task
        ));
      } else {
        const response = await authFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({ title: newTaskText, dueDate: newTaskDate, categoryId: newTaskCategoryId }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create task');

        const created: TaskResponse = result.data;
        setTasks(prev => [
          { id: created.id, title: created.title, status: created.status, dueDate: newTaskDate, categoryId: created.categoryId },
          ...prev,
        ]);
      }
      resetForm();
    } catch (error) {
      console.error('Save task error:', error);
    }
  };
  
  const resetForm = () => {
    setNewTaskText('');
    setNewTaskDate('');
    setEditingId(null);
    setIsAddingNewCategory(false);
    setActiveTab('home');
  };
  
  //update status task
  const toggleTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = isTaskCompleted(task) ? 'todo' : 'done';
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

    try {
      const response = await authFetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update status');
    } catch (error) {
      console.error('Toggle task error:', error);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: task.status } : t));
    }
  };
  
  //delete task
  const deleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const previousTasks = tasks;
    setTasks(prev => prev.filter(task => task.id !== id));

    try {
      const response = await authFetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Delete task error:', error);
      setTasks(previousTasks);
    }
  };
  
  const startEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(task.id);
    setNewTaskText(task.title);
    setNewTaskDate(task.dueDate ?? '');
    setNewTaskCategoryId(task.categoryId || categories[0]?.id || '');
    setActiveTab('create-todo');
  };

  return (
    <div className="home-page">
      {/* ----------------- SIDEBAR ----------------- */}
      <div className="sidebar">

        {/* Logo ซ้าย */}
        <div className="logo-section">
            <img
            src="/images/logo.png"
            alt="Pomonest Logo"
            className="sidebar-logo"
            />
        </div>

        {/* Menu กลาง */}
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

        {/* Profile ขวา */}
        <div className="profile-section">
          <div
            className="profile-trigger"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <img
              src={user?.avatar || '/images/profile1.png'}
              alt={user?.username || 'Profile'}
              className="profile-image"
            />
          </div>

          {isProfileOpen && (
            <div className="profile-dropdown">

              <div className='profile-name'>
                <img
                  src={user?.avatar || '/images/profile1.png'}
                  alt={user?.username || 'Profile'}
                  className="profile-image"
                />

                <div className='groupname'>
                  <span className="name">
                    {user?.username || 'user1'}
                  </span>
                  <span className="email">
                    {user?.email || 'email not found'}
                  </span>
                </div>
              </div>

              <button
                className="button-logout"
                onClick={handleLogout}
              >
                <FontAwesomeIcon 
                  icon={faGear}
                  style={{color: "#806a5aff",}} />
                <span>account</span>
              </button>

              <button
                className="button-logout"
                onClick={handleLogout}
              >
                <FontAwesomeIcon 
                  icon={faDoorOpen}
                  style={{color: "#806a5aff",}} />
                <span>sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ----------------- MAIN CONTENT ----------------- */}
      <div className="main-content">
        
        {/* === HOME (Dashboard) === */}
        {activeTab === 'home' && (
          <div className="body-container">
            <div className='room' ref={roomRef}>
              <div className='room-world' ref={worldRef}>

                <img 
                  src="/images/room.svg"
                  className="room-background"
                />

                {ownedAnimals.map((animal) => {
                  const layout = ANIMAL_LAYOUT[animal.name];
                  if (!layout) return null;

                  return (
                    <div className={layout.className} key={animal.name}>
                      {layout.shadow && <div className={layout.shadow}></div>}
                      <img
                        src={`${ASSET_BASE_URL}/${animal.animation}`}
                      />
                    </div>
                  );
                })}

              </div>
            </div>

            {/* time */}
            <div className="room-time">
              <div className="current-time">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>

              <div className="current-date">
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                })}
                {' | '}
                {currentTime.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Today's Tasks</h2>
                  <button className="btn-todo" onClick={() => { setEditingId(null); setNewTaskText(''); setActiveTab('create-todo'); }}>
                    <span>+</span>
                  </button>
                </div>

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
                              <div key={task.id} className="task-item" style={{ cursor: isTaskCompleted(task) ? 'default' : 'pointer' }} >
                                <div className="task-left">
                                  <div className={`task-checkbox ${isTaskCompleted(task) ? 'completed' : ''}`} onClick={(e) => toggleTask(task.id, e)}>
                                    {isTaskCompleted(task) && '✓'}
                                  </div>
                                  <span className={`task-text ${isTaskCompleted(task) ? 'completed' : ''}`}>{task.title}</span>
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

                  {(() => {
                    const otherTasks = tasks.filter(t => !t.categoryId);
                    if (otherTasks.length === 0) return null;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#999', marginRight: '10px' }}></span>
                          <span style={{ fontWeight: 'bold', color: '#4a3320', flex: 1, fontSize: '14px' }}>Other</span>
                          <span style={{ color: '#8c735e', fontSize: '12px' }}>{otherTasks.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
                          {otherTasks.map(task => (
                            <div key={task.id} className="task-item" style={{ cursor: isTaskCompleted(task) ? 'default' : 'pointer' }} >
                              <div className="task-left">
                                <div className={`task-checkbox ${isTaskCompleted(task) ? 'completed' : ''}`} onClick={(e) => toggleTask(task.id, e)}>
                                  {isTaskCompleted(task) && '✓'}
                                </div>
                                <span className={`task-text ${isTaskCompleted(task) ? 'completed' : ''}`}>{task.title}</span>
                              </div>
                              <div className="task-actions">
                                <button className="icon-btn" onClick={(e) => startEdit(task, e)}><FontAwesomeIcon icon={faPenToSquare} /></button>
                                <button className="icon-btn" onClick={(e) => deleteTask(task.id, e)}><FontAwesomeIcon icon={faTrashCan} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
          </div>
        )}

        {activeTab === 'create-todo' && (
          <CreateTodo
            editingId={editingId}
            newTaskText={newTaskText}
            setNewTaskText={setNewTaskText}
            newTaskDate={newTaskDate}
            setNewTaskDate={setNewTaskDate}
            newTaskCategoryId={newTaskCategoryId}
            setNewTaskCategoryId={setNewTaskCategoryId}
            categories={categories}
            selectedCategory={selectedCategory}
            isAddingNewCategory={isAddingNewCategory}
            setIsAddingNewCategory={setIsAddingNewCategory}
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            newCategoryColor={newCategoryColor}
            setNewCategoryColor={setNewCategoryColor}
            setEditingCategoryId={setEditingCategoryId}
            isCategoryDropdownOpen={isCategoryDropdownOpen}
            setIsCategoryDropdownOpen={setIsCategoryDropdownOpen}
            handleAddNewCategory={handleAddNewCategory}
            handleEditCategory={handleEditCategory}
            handleDeleteCategory={handleDeleteCategory}
            saveTask={saveTask}
            resetForm={resetForm}
          />
        )}
        
                {/* {['focus', 'select-egg', 'focus-timer', 'collection'].includes(activeTab) && (
                  <Focus 
                    activeTab={activeTab === 'focus' ? 'select-egg' : activeTab} // บังคับให้เริ่มที่หน้าเลือกไข่ถ้ากดจากเมนู Focus
                    setActiveTab={setActiveTab} 
                    task={focusTask} 
                  />
                )} */}

      </div>
    </div>
  );
}