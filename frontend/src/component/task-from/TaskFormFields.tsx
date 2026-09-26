import type { Category } from '../../hooks/useCategories';
import CategorySelector from './CategorySelector';

interface TaskFormFieldsProps {
  title: string;
  setTitle: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  categories: Category[];
  onCreateCategory: (name: string, color: string) => Promise<Category>;
  onUpdateCategory: (id: string, name: string, color: string) => Promise<Category>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function TaskFormFields({
  title, setTitle, dueDate, setDueDate, categoryId, setCategoryId,
  categories, onCreateCategory, onUpdateCategory, onDeleteCategory,
}: TaskFormFieldsProps) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320' }}>Task Title</label>
        <input
          type="text"
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2d7c8', fontSize: '16px', outline: 'none' }}
          placeholder="What do you want to focus on?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320' }}>DueDate</label>
        <input
          type="date"
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2d7c8', fontSize: '16px', outline: 'none', cursor: 'pointer' }}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <CategorySelector
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onCreate={onCreateCategory}
        onUpdate={onUpdateCategory}
        onDelete={onDeleteCategory}
      />
    </>
  );
}