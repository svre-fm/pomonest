import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useTasks } from '../hooks/useTasks';
import { useTaskForm } from '../hooks/useTaskForm';
import { useEggs } from '../hooks/useEgg';
import TaskFormFields from '../component/task-from/TaskFormFields';
import TaskListSection from '../component/TaskListSection';
import '../select.css';

const EGG_BASE_URL = '/images/eggs';

type FocusMode = 'task' | 'quick';

export default function Focus() {
  const navigate = useNavigate();
  const [rightPanelMode, setRightPanelMode] = useState<'list' | 'create'>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  void selectedTaskId;
  const [selectedEggId, setSelectedEggId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
  const { tasks, addTaskLocally, toggleTask, deleteTask } = useTasks();
  const { eggs } = useEggs();

  const filteredTasks = tasks.filter((task) => {
    return task.status !== 'done'; 
  });

  const [focusMode, setFocusMode] = useState<FocusMode>('quick');
  const [activityName, setActivityName] = useState('');

  const form = useTaskForm(undefined, (createdTask) => {
    addTaskLocally({
      id: createdTask.id,
      title: createdTask.title,
      status: createdTask.status,
      dueDate: createdTask.dueDate,
      categoryId: createdTask.categoryId,
    });
    setSelectedTaskId(createdTask.id);
    if (selectedEggId) {
      navigate(`/focus-session?taskId=${createdTask.id}&eggId=${selectedEggId}`);
    } else {
      setRightPanelMode('list');
    }
  });

  const toggleCategoryDropdown = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

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

  const handleStartFocus = async () => {
    if (focusMode === 'task') {
      navigate(`/focus-session?taskId=${selectedTaskId}&eggId=${selectedEggId}`);
      return;
    }

    try {
      const response = await authFetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify({ name: activityName.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create activity');

      navigate(`/focus-session?activityId=${result.data.id}&eggId=${selectedEggId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start quick focus');
    }
  };

  return (
    <div className="backdrop" onClick={() => navigate('/home')}>
        <div className="contianer-select" onClick={(e) => e.stopPropagation()}>
        <div className="back-btn-wrapper" onClick={() => navigate('/home')}>
            <div className="btn-back-circle">←</div>
            <span>Back to Dashboard</span>
        </div>

        <div className="focus-content">
            {/* คอลัมน์ซ้าย: เลือกไข่ */}
            <div className="contianer-egg">
            {eggs.map((egg) => (
                <div
                key={egg.id}
                className={`egg-card ${selectedEggId === egg.id ? 'selected' : ''}`}
                onClick={() => setSelectedEggId(egg.id)}
                >
                <img src={`${EGG_BASE_URL}/${egg.image}`} alt={egg.name} className="egg-image" />
                <span className="egg-name">{egg.name}</span>
                <span className="egg-required">{egg.required} min</span>
                </div>
            ))}
            </div>

            {/* คอลัมน์ขวา: task panel */}
            <div className="focus-task-panel">
                <div className="focus-mode-tabs">
                  <span> Select Foucus mode</span>
                  <button
                    className={focusMode === 'task' ? 'active' : ''}
                    onClick={() => setFocusMode('task')}
                  >
                    Task
                  </button>
                  <button
                    className={focusMode === 'quick' ? 'active' : ''}
                    onClick={() => setFocusMode('quick')}
                  >
                    Quick start
                  </button>
                </div>
            {focusMode === 'task' ? (
              rightPanelMode === 'list' ? (
                <>
                  
                    <div className="card-header">
                      <h2 style={{fontSize : '20px', color: '#8c735e', fontWeight : '400'}}>Select a Task</h2>
                      <button className="btn-todo" onClick={() => setRightPanelMode('create')}>
                        <span>+</span>
                      </button>
                    </div>

                  <div className='task-container'>
                    <TaskListSection
                      categories={categories}
                      tasks={filteredTasks}
                      expandedCategories={expandedCategories}
                      onToggleCategory={toggleCategoryDropdown}
                      onToggleTask={toggleTask}
                      onDeleteTask={deleteTask}
                      onTaskClick={(task) => setSelectedTaskId(task.id)}
                      selectedTaskId={selectedTaskId}
                      compact
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="card-header">
                    <h2 className="card-title">Create New Todo</h2>
                    <button className="btn-todo" onClick={() => setRightPanelMode('list')}>
                      <span>←</span>
                    </button>
                  </div>

                  <TaskFormFields
                    title={form.title} setTitle={form.setTitle}
                    dueDate={form.dueDate} setDueDate={form.setDueDate}
                    categoryId={form.categoryId} setCategoryId={form.setCategoryId}
                    categories={categories}
                    onCreateCategory={createCategory}
                    onUpdateCategory={updateCategory}
                    onDeleteCategory={deleteCategory}
                  />
                </>
              )
            ) : (
              <>
                <div className="quick-start-panel">
                  <p className="quick-start-hint">
                    What are you focusing on? <span style={{ color: 'red' }}>(optional)</span>
                  </p>
                  
                  <input
                    type="text"
                    className="activity-name-input"
                    placeholder="Just hit start if you're not sure yet"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                  />
                </div>
              </>
            )}
            <button
              className="btn-start-focus"
              disabled={
                focusMode === 'task'
                  ? !selectedTaskId || !selectedEggId
                  : !selectedEggId 
              }
              onClick={handleStartFocus}
            >
              Start Focus
            </button>
            </div>
        </div>
        </div>
    </div>
    );
}