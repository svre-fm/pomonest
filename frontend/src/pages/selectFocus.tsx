import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useTasks } from '../hooks/useTasks';
import { useTaskForm } from '../hooks/useTaskForm';
import TaskFormFields from '../component/task-from/TaskFormFields';
import TaskListSection from '../component/TaskListSection';
import './se'

export default function Focus() {
  const navigate = useNavigate();
  const [rightPanelMode, setRightPanelMode] = useState<'list' | 'create'>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
  const { tasks, addTaskLocally, toggleTask, deleteTask } = useTasks();

  const form = useTaskForm(undefined, (createdTask) => {
    addTaskLocally({
      id: createdTask.id,
      title: createdTask.title,
      status: createdTask.status,
      dueDate: createdTask.dueDate,
      categoryId: createdTask.categoryId,
    });
    setSelectedTaskId(createdTask.id);
    setRightPanelMode('list');
  });

  const handleSaveNewTask = async () => {
    try {
      await form.save();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save task');
    }
  };

  const toggleCategoryDropdown = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  return (

    <div className="todo-modal-overlay" onClick={() => navigate('/home')}>
          <div className="card-todo todo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="back-btn-wrapper" onClick={() => navigate('/home')}>
              <div className="btn-back-circle">←</div>
              <span>Back to Dashboard</span>
            </div>
                <div className="focus-task-panel" style={{ flex: 1 }}>
                    {rightPanelMode === 'list' ? (
                    <>
                        <div className="card-header">
                        <h2 className="card-title">Select a Task</h2>
                        <button className="btn-todo" onClick={() => setRightPanelMode('create')}>
                            <span>+</span>
                        </button>
                        </div>

                        <TaskListSection
                        categories={categories}
                        tasks={tasks}
                        expandedCategories={expandedCategories}
                        onToggleCategory={toggleCategoryDropdown}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                        onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                    </>
                    ) : (
                    <>
                        <div className="back-btn-wrapper" onClick={() => setRightPanelMode('list')}>
                        <div className="btn-back-circle">←</div>
                        <span>Back to Task List</span>
                        </div>
                        <h2 className="card-title" style={{ fontSize: '24px', marginBottom: '25px' }}>Create New Todo</h2>

                        <TaskFormFields
                        title={form.title} setTitle={form.setTitle}
                        dueDate={form.dueDate} setDueDate={form.setDueDate}
                        categoryId={form.categoryId} setCategoryId={form.setCategoryId}
                        categories={categories}
                        onCreateCategory={createCategory}
                        onUpdateCategory={updateCategory}
                        onDeleteCategory={deleteCategory}
                        />

                        <button onClick={handleSaveNewTask} className="btn-save">SAVE & ADD TASK</button>
                    </>
                    )}
                </div>
          </div>
        </div>
  );
}