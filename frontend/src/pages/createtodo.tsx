import { useNavigate, useParams } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useTaskForm } from '../hooks/useTaskForm';
import TaskFormFields from '../component/task-from/TaskFormFields';

export default function CreateTodo() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId?: string }>();
  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
  const form = useTaskForm(taskId, () => navigate('/home'));

  const handleSave = async () => {
    try {
      await form.save();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save task');
    }
  };

  return (
    <div className="todo-modal-overlay" onClick={() => navigate('/home')}>
      <div className="card-todo todo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="back-btn-wrapper" onClick={() => navigate('/home')}>
          <div className="btn-back-circle">←</div>
          <span>Back to Dashboard</span>
        </div>

        <h2 className="card-title" style={{ fontSize: '24px', marginBottom: '25px' }}>
          {form.isEditMode ? 'Edit Todo' : 'Create New Todo'}
        </h2>

        <TaskFormFields
          title={form.title} setTitle={form.setTitle}
          dueDate={form.dueDate} setDueDate={form.setDueDate}
          categoryId={form.categoryId} setCategoryId={form.setCategoryId}
          categories={categories}
          onCreateCategory={createCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
        />

        <button onClick={handleSave} className="btn-save">
          {form.isEditMode ? 'UPDATE TASK' : 'SAVE & ADD TASK'}
        </button>
      </div>
    </div>
  );
}