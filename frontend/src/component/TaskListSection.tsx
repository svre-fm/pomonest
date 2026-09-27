import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan} from '@fortawesome/free-regular-svg-icons';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { isTaskCompleted } from '../hooks/useTasks';
import type { Task } from '../hooks/useTasks';
import type { Category } from '../hooks/useCategories';

interface TaskListSectionProps {
  categories: Category[];
  tasks: Task[];
  expandedCategories: string[];
  onToggleCategory: (categoryId: string) => void;
  onToggleTask: (id: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onTaskClick?: (task: Task) => void;
}

export const formatDueDate = (dueDate: string | null) => {
  if (!dueDate) return '';
  return new Date(dueDate).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
};

export default function TaskListSection({
  categories, tasks, expandedCategories, onToggleCategory,
  onToggleTask, onEditTask, onDeleteTask, onTaskClick,
}: TaskListSectionProps) {
  const renderTaskItem = (task: Task) => (
    <div
      key={task.id}
      className="task-item"
      style={{ cursor: isTaskCompleted(task) || onTaskClick ? 'pointer' : 'default' }}
      onClick={() => onTaskClick?.(task)}
    >
      <div className="task-left">
        <div
          className={`task-checkbox ${isTaskCompleted(task) ? 'completed' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
        >
          {isTaskCompleted(task) && <FontAwesomeIcon icon={faCheck} style={{fontSize : '16px'}} />}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span className={`task-text ${isTaskCompleted(task) ? 'completed' : ''}`}>{task.title}</span>
            <span className='task-text' style={{fontWeight: '200', color: '#c7b9adff', fontSize: '12px'}}>
                {formatDueDate(task.dueDate)}
            </span>
        </div>
        
      </div>
      <div className="task-actions">
        {onEditTask && (
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
        )}
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}>
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
    </div>
  );

  const otherTasks = tasks.filter(t => !t.categoryId);

  return (
    <div className="task-list">
      {categories.map(category => {
        const categoryTasks = tasks.filter(t => t.categoryId === category.id);
        if (categoryTasks.length === 0) return null;
        const isExpanded = expandedCategories.includes(category.id);
        return (
          <div key={category.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div onClick={() => onToggleCategory(category.id)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '5px 0' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: category.color, marginRight: '10px' }}></span>
              <span style={{ fontWeight: 'bold', color: '#4a3320', flex: 1, fontSize: '14px' }}>{category.name}</span>
              <span style={{ color: '#8c735e', fontSize: '12px', marginRight: '10px' }}>{categoryTasks.length}</span>
              <span style={{ color: '#8c735e', fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
            </div>
            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
                {categoryTasks.map(renderTaskItem)}
              </div>
            )}
          </div>
        );
      })}

      {otherTasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#999', marginRight: '10px' }}></span>
            <span style={{ fontWeight: 'bold', color: '#4a3320', flex: 1, fontSize: '14px' }}>Other</span>
            <span style={{ color: '#8c735e', fontSize: '12px' }}>{otherTasks.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
            {otherTasks.map(renderTaskItem)}
          </div>
        </div>
      )}
    </div>
  );
}