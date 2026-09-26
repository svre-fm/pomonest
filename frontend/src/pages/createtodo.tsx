import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CreateTodoModalProps {
  editingId: string | null;

  newTaskText: string;
  setNewTaskText: (value: string) => void;

  newTaskDate: string;
  setNewTaskDate: (value: string) => void;

  newTaskCategoryId: string;
  setNewTaskCategoryId: (value: string) => void;

  categories: Category[];
  selectedCategory: Category | undefined;

  isAddingNewCategory: boolean;
  setIsAddingNewCategory: (updater: (prev: boolean) => boolean) => void;

  newCategoryName: string;
  setNewCategoryName: (value: string) => void;

  newCategoryColor: string;
  setNewCategoryColor: (value: string) => void;

  setEditingCategoryId: (value: string | null) => void;

  isCategoryDropdownOpen: boolean;
  setIsCategoryDropdownOpen: (updater: (prev: boolean) => boolean) => void;

  handleAddNewCategory: () => void;
  handleEditCategory: (category: Category) => void;
  handleDeleteCategory: (categoryId: string) => void;

  saveTask: () => void;
  resetForm: () => void;
}

export default function CreateTodoModal({
  editingId,
  newTaskText,
  setNewTaskText,
  newTaskDate,
  setNewTaskDate,
  newTaskCategoryId,
  setNewTaskCategoryId,
  categories,
  selectedCategory,
  isAddingNewCategory,
  setIsAddingNewCategory,
  newCategoryName,
  setNewCategoryName,
  newCategoryColor,
  setNewCategoryColor,
  setEditingCategoryId,
  isCategoryDropdownOpen,
  setIsCategoryDropdownOpen,
  handleAddNewCategory,
  handleEditCategory,
  handleDeleteCategory,
  saveTask,
  resetForm,
}: CreateTodoModalProps) {
  return (
    <div className="todo-modal-overlay" onClick={resetForm}>
      <div className="card-todo todo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="back-btn-wrapper" onClick={resetForm}>
          <div className="btn-back-circle">←</div>
          <span>Back to Dashboard</span>
        </div>

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320' }}>DueDate</label>
          <input
            type="date"
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2d7c8', fontSize: '16px', outline: 'none', cursor: 'pointer' }}
            value={newTaskDate}
            onChange={(e) => setNewTaskDate(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320', display: 'flex', justifyContent: 'space-between' }}>
            Category
            <span
              style={{ color: '#7fa65a', cursor: 'pointer', fontWeight: 'normal' }}
              onClick={() => {
                setIsAddingNewCategory(prev => !prev);
                setEditingCategoryId(null);
                setNewCategoryName('');
                setNewCategoryColor('#7fa65a');
              }}
            >
              {isAddingNewCategory ? 'Cancel' : '+ New Category'}
            </span>
          </label>

          {isAddingNewCategory ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="color"
                className="color-picker-input"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
              />
              <input
                type="text"
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid #e2d7c8', fontSize: '16px', outline: 'none' }}
                placeholder="Enter new category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button onClick={handleAddNewCategory} className="btn-add">Add</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '10px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <button
                  type="button"
                  className="task-category-trigger"
                  onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                >
                  <span>{selectedCategory?.name || 'Select category'}</span>
                  <FontAwesomeIcon icon={faCaretDown} />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="task-category-list">
                    {categories.map(cat => (
                      <div
                        key={cat.id}
                        className="showcategory"
                        onClick={() => {
                          setNewTaskCategoryId(cat.id);
                          setIsCategoryDropdownOpen(() => false);
                          setEditingCategoryId(null);
                        }}
                      >
                        {cat.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCategory && (
                <>
                  <div className="btn-squ" onClick={() => handleEditCategory(selectedCategory)}>
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </div>
                  <div className="btn-squ" onClick={() => handleDeleteCategory(selectedCategory.id)}>
                    <FontAwesomeIcon icon={faTrashCan} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <button onClick={saveTask} className="btn-save">
          {editingId ? 'UPDATE TASK' : 'SAVE & ADD TASK'}
        </button>
      </div>
    </div>
  );
}