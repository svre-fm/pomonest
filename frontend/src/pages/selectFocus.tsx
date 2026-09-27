import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useTasks } from '../hooks/useTasks';
import { useTaskForm } from '../hooks/useTaskForm';
import { useEggs } from '../hooks/useEgg';
import TaskFormFields from '../component/task-from/TaskFormFields';
import TaskListSection from '../component/TaskListSection';
import '../select.css';

const EGG_BASE_URL = '/images';

type FocusMode = 'task' | 'quick';

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

export default function Focus() {
  const navigate = useNavigate();

  const [rightPanelMode, setRightPanelMode] =
    useState<'list' | 'create'>('list');
  const [selectedTaskId, setSelectedTaskId] =
    useState<string | null>(null);
  const [selectedEggId, setSelectedEggId] =
    useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] =
    useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] =
    useState<string | null>(null);

  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const {
    tasks,
    addTaskLocally,
    toggleTask,
    deleteTask,
  } = useTasks();

  const { eggs } = useEggs();

  // Shows only task not completed.
  const filteredTasks = tasks.filter(
    task => task.status !== 'done'
  );

  const [focusMode, setFocusMode] =
    useState<FocusMode>('quick');
  const [activityName, setActivityName] = useState('');

  // Starts hatching the selected egg.
  const startHatchingEgg = async (eggId: number): Promise<string> => {
    const response = await authFetch('/api/user-eggs', {
      method: 'POST',
      body: JSON.stringify({ eggId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to start egg');
    }

    return result.data.id;
  };

  // created new task and starts the focus session if an egg is selected.
  const form = useTaskForm(undefined, async (createdTask) => {
    addTaskLocally({
      id: createdTask.id,
      title: createdTask.title,
      status: createdTask.status,
      dueDate: createdTask.dueDate,
      categoryId: createdTask.categoryId,
    });

    setSelectedTaskId(createdTask.id);

    if (selectedEggId) {
      setIsStarting(true);
      setStartError(null);

      try {
        const userEggId = await startHatchingEgg(selectedEggId);

        navigate(
          `/focus-session?taskId=${createdTask.id}&userEggId=${userEggId}`
        );
      } catch (error) {
        setStartError(
          error instanceof Error
            ? error.message
            : 'Failed to start focus'
        );
      } finally {
        setIsStarting(false);
      }
    } else {
      setRightPanelMode('list');
    }
  });

  // Opens category dropdown.
  const toggleCategoryDropdown = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Starts the focus session
  const handleStartFocus = async () => {
    if (!selectedEggId) return;

    setIsStarting(true);
    setStartError(null);

    try {
      const userEggId = await startHatchingEgg(selectedEggId);

      // Starts a focus session for an existing task.
      if (focusMode === 'task') {
        navigate(
          `/focus-session?taskId=${selectedTaskId}&userEggId=${userEggId}`
        );
        return;
      }

      // Creates a new activity for quick focus mode.
      const actRes = await authFetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          name: activityName.trim(),
        }),
      });

      const actResult = await actRes.json();

      if (!actRes.ok) {
        throw new Error(
          actResult.error || 'Failed to create activity'
        );
      }

      navigate(
        `/focus-session?activityId=${actResult.data.id}&userEggId=${userEggId}`
      );
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : 'Failed to start focus'
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="backdrop" onClick={() => navigate('/home')}>
      <div className="contianer-select" onClick={(e) => e.stopPropagation()}>
        <div className="back-btn-wrapper" onClick={() => navigate('/home')}>
          <div className="back-circle">←</div>
          <span>Back to Dashboard</span>
        </div>

        <div className="focus-content">
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

          <div className="focus-task-panel">
            <div className="focus-mode-tabs">
              <span>Select Focus mode</span>
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
                    <h2 style={{ fontSize: '20px', color: '#8c735e', fontWeight: '400' }}>Select a Task</h2>
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
              <div className="quick-start-panel">
                <p className="quick-start-hint">
                  What are you focusing on? <span className="optional-tag">(optional)</span>
                </p>
                <input
                  type="text"
                  className="activity-name-input"
                  placeholder="Just hit start if you're not sure yet"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                />
              </div>
            )}

            {startError && (
              <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '10px' }}>{startError}</p>
            )}

            <button
              className="btn-start-focus"
              disabled={
                isStarting ||
                (focusMode === 'task' ? !selectedTaskId || !selectedEggId : !selectedEggId)
              }
              onClick={handleStartFocus}
            >
              {isStarting ? 'Starting...' : 'Start Focus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}