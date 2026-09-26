import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import type { Category } from '../../hooks/useCategories';

interface CategorySelectorProps {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string, color: string) => Promise<Category>;
  onUpdate: (id: string, name: string, color: string) => Promise<Category>;
  onDelete: (id: string) => Promise<void>;
}

export default function CategorySelector({
  categories, selectedId, onSelect, onCreate, onUpdate, onDelete,
}: CategorySelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7fa65a');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selected = categories.find(c => c.id === selectedId);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor('#7fa65a');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await onUpdate(editingId, name, color);
      } else {
        const newCat = await onCreate(name, color);
        onSelect(newCat.id);
      }
      resetForm();
      setIsAdding(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save category');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3320', display: 'flex', justifyContent: 'space-between' }}>
        Category
        <span
          style={{ color: '#7fa65a', cursor: 'pointer', fontWeight: 'normal' }}
          onClick={() => { setIsAdding(prev => !prev); resetForm(); }}
        >
          {isAdding ? 'Cancel' : '+ New Category'}
        </span>
      </label>

      {isAdding ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="color" className="color-picker-input" value={color} onChange={(e) => setColor(e.target.value)} />
          <input
            type="text"
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid #e2d7c8', fontSize: '16px', outline: 'none' }}
            placeholder="Enter new category name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={handleSave} className="btn-add">Add</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '10px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <button type="button" className="task-category-trigger" onClick={() => setIsDropdownOpen(prev => !prev)}>
              <span>{selected?.name || 'Select category'}</span>
              <FontAwesomeIcon icon={faCaretDown} />
            </button>

            {isDropdownOpen && (
              <div className="task-category-list">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="showcategory"
                    onClick={() => { onSelect(cat.id); setIsDropdownOpen(false); }}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <>
              <div className="btn-squ" onClick={() => { setEditingId(selected.id); setName(selected.name); setColor(selected.color); setIsAdding(true); }}>
                <FontAwesomeIcon icon={faPenToSquare} />
              </div>
              <div className="btn-squ" onClick={() => onDelete(selected.id)}>
                <FontAwesomeIcon icon={faTrashCan} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}