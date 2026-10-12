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

  // State ปกติ
  const [rightPanelMode, setRightPanelMode] = useState<'list' | 'create'>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedEggId, setSelectedEggId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // State สำหรับระบบ Resume และล็อกไข่
  const [lockedEggId, setLockedEggId] = useState<number | null>(null);
  const [resumeUserEggId, setResumeUserEggId] = useState<string | null>(null);

  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
  const { tasks, addTaskLocally, toggleTask, deleteTask } = useTasks();
  const { eggs } = useEggs();

  // โชว์เฉพาะ Task ที่ยังไม่เสร็จ
  const filteredTasks = tasks.filter(task => task.status !== 'done');

  const [focusMode, setFocusMode] = useState<FocusMode>('quick');
  const [activityName, setActivityName] = useState('');

  // เริ่มฟักไข่และสร้าง UserEgg ใหม่
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

  // สร้าง Task ใหม่และเริ่ม Focus เมื่อเลือกไข่แล้ว
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
        navigate(`/focus-session?taskId=${createdTask.id}&userEggId=${userEggId}&baseEggId=${selectedEggId}`);
      } catch (error) {
        setStartError(error instanceof Error ? error.message : 'Failed to start focus');
      } finally {
        setIsStarting(false);
      }
    } else {
      setRightPanelMode('list');
    }
  });

  // เปิด/ปิด Dropdown ของ Category
  const toggleCategoryDropdown = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // เริ่ม Focus
  const handleStartFocus = async () => {
    setStartError(null);

    if (focusMode === 'quick' && !selectedEggId) {
      setStartError("Please select the egg to hatch");
      return;
    }

    if (focusMode === 'task') {
      if (!selectedEggId && !selectedTaskId) {
        setStartError("Please select the task and the egg to hatch");
        return;
      }
      if (!selectedEggId) {
        setStartError("Please select the egg to hatch");
        return;
      }
      if (!selectedTaskId) {
        setStartError("Please select the task");
        return;
      }
    }

    setIsStarting(true);
    setStartError(null);

    try {
      // ถ้าเป็นการกลับมาทำ Task เดิมที่ค้างไว้ (ไม่ต้องสร้างไข่ใหม่)
      if (focusMode === 'task' && resumeUserEggId) {
        navigate(`/focus-session?taskId=${selectedTaskId}&userEggId=${resumeUserEggId}&baseEggId=${selectedEggId}&resume=true`);
        return;
      }

      // ถ้าเป็นงานใหม่ ให้สร้างไข่ใหม่
      const userEggId = await startHatchingEgg(selectedEggId!);

      if (focusMode === 'task') {
        navigate(`/focus-session?taskId=${selectedTaskId}&userEggId=${userEggId}&baseEggId=${selectedEggId}`);
        return;
      }

      // โหมด Quick Start
      const actRes = await authFetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify({ name: activityName.trim() }),
      });

      const actResult = await actRes.json();

      if (!actRes.ok) {
        throw new Error(actResult.error || 'Failed to create activity');
      }

      navigate(`/focus-session?activityId=${actResult.data.id}&userEggId=${userEggId}&baseEggId=${selectedEggId}`);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Failed to start focus');
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
                
                // เปลี่ยนการเทียบ ป้องกันปัญหา '1' !== 1
                style={lockedEggId !== null && String(lockedEggId) !== String(egg.id) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                
                onClick={(e) => {
                  // ดักเงื่อนไข
                  if (lockedEggId !== null && String(lockedEggId) !== String(egg.id)) {
                    e.preventDefault(); // บล็อกการกด
                    setStartError("Can not change the egg while a focus session is in progress");
                    return; // สั่งหยุดการทำงานไม่ให้เปลี่ยนไข่
                  }
                  
                  // ถ้าไม่ได้ล็อกไข่ไว้ ถึงจะเปลี่ยนไข่ได้
                  setSelectedEggId(egg.id);
                  setStartError(null);
                }}
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

                  <div className='task-container' style={{ overflowX: 'hidden', padding: '5px' }}>
                    <TaskListSection
                      categories={categories}
                      tasks={filteredTasks}
                      expandedCategories={expandedCategories}
                      onToggleCategory={toggleCategoryDropdown}
                      onToggleTask={toggleTask}
                      onDeleteTask={deleteTask}
                      // ตรวจสอบเวลากดเลือก Task ว่ามีเซสชันค้างอยู่ไหม ถ้าใช่ให้ล็อกไข่ใบเดิมไว้
                      onTaskClick={(task) => {
                        setSelectedTaskId(task.id);
                        setStartError(null);

                        // ค้นหาว่า Task นี้ถูกเซฟค้างไว้หรือไม่จาก sessionStorage
                        const savedTasksStr = sessionStorage.getItem('pomonest_saved_tasks');
                        if (savedTasksStr) {
                          try {
                            const savedTasks = JSON.parse(savedTasksStr);
                            if (savedTasks[task.id]) {
                              const bId = Number(savedTasks[task.id].baseEggId);
                              if (bId) {
                                setSelectedEggId(bId);
                                setLockedEggId(bId);
                              }
                              setResumeUserEggId(savedTasks[task.id].userEggId);
                              return;
                            }
                          } catch (e) {}
                        }
                        // ถ้าไม่มีเซสซันค้างไว้ เลือกไข่ได้ทั้งหมด
                        setLockedEggId(null);
                        setResumeUserEggId(null);
                      }}
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

                  {startError && (
                    <p style={{ color: '#c0392b', fontSize: '13px', marginTop: '15px', marginBottom: '0', textAlign: 'center' }}>
                      {startError}
                    </p>
                  )}

                  <button 
                    className="btn-save" 
                    onClick={() => {
                      setStartError(null);
                      if (!form.title || form.title.trim() === "") {
                        setStartError("Invalid Task Title");
                        return;
                      }
                      if (!selectedEggId) {
                        setStartError("Please select the egg to hatch");
                        return;
                      }
                      form.save();
                    }} 
                    style={{ marginTop: '10px' }}
                  >
                    Save & Start Focus
                  </button>
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
                  placeholder="You can also start focusing right away without the title"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                />
              </div>
            )}

            {startError && !(focusMode === 'task' && rightPanelMode === 'create') && (
              <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '10px', textAlign: 'center' }}>
                {startError}
              </p>
            )}

            {!(focusMode === 'task' && rightPanelMode === 'create') && (
              <button
                className="btn-start-focus"
                disabled={isStarting}
                onClick={handleStartFocus}
              >
                {isStarting ? 'Starting...' : 'Start Focus'}
              </button>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}