import { useState, useEffect } from 'react';

export interface TaskResponse {
  id: string;
  categoryId: string | null;
  title: string;
  status: 'todo' | 'doing' | 'done';
  dueDate: string | null;
}

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

export function useTaskForm(taskId?: string, onSaved?: (task: TaskResponse) => void) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const isEditMode = Boolean(taskId);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    setIsLoading(true);
    const fetchTask = async () => {
      try {
        const response = await authFetch(`/api/tasks/${taskId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch task');
        const task: TaskResponse = result.data;
        setTitle(task.title);
        setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
        setCategoryId(task.categoryId || '');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load task');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTask();
  }, [taskId]);

  const reset = () => {
    setTitle('');
    setDueDate('');
    setCategoryId('');
  };

  const save = async () => {
    if (!title.trim()) return;

    const url = isEditMode ? `/api/tasks/${taskId}` : '/api/tasks';
    const method = isEditMode ? 'PUT' : 'POST';

    const response = await authFetch(url, {
      method,
      body: JSON.stringify({ title, dueDate, categoryId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to save task');

    onSaved?.(result.data);
    reset();
    return result.data as TaskResponse;
  };

  return { title, setTitle, dueDate, setDueDate, categoryId, setCategoryId, isEditMode, save, reset, isLoading, loadError };
}