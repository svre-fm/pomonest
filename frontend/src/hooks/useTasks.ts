import { useState, useEffect } from 'react';

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  categoryId: string | null;
  dueDate: string | null;
}

interface TaskResponse extends Task {
  userId: string;
  categoryName: string | null;
  categoryColor: string | null;
  completedAt: string | null;
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

export const isTaskCompleted = (task: Task) => task.status === 'done';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await authFetch('/api/tasks');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch tasks');

        const rawTasks: TaskResponse[] = result.data;
        setTasks(rawTasks.map((t) => ({
          id: t.id, title: t.title, status: t.status, dueDate: t.dueDate, categoryId: t.categoryId,
        })));
      } catch (error) {
        console.error('Fetch tasks error:', error);
      }
    };
    fetchTasks();
  }, []);

  const addTaskLocally = (task: Task) => {
    setTasks(prev => [task, ...prev]);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = isTaskCompleted(task) ? 'todo' : 'done';
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try {
      const response = await authFetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
    } catch (error) {
      console.error('Toggle task error:', error);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: task.status } : t));
    }
  };

  const deleteTask = async (id: string) => {
    const previous = tasks;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      const response = await authFetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete task');
    } catch (error) {
      console.error('Delete task error:', error);
      setTasks(previous);
    }
  };

  return { tasks, addTaskLocally, toggleTask, deleteTask };
}