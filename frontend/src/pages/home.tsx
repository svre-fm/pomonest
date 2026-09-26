import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useTasks } from '../hooks/useTasks';
import TaskListSection from '../component/TaskListSection';
import '../home.css';
import '../select.css';

interface OwnedAnimal {
  name: string;
  image: string;
  animation: string;
}

const ANIMAL_LAYOUT: Record<string, { className: string; shadow: string | null }> = {
  Dog:     { className: 'dog',     shadow: 'shadow-dog' },
  Cat:     { className: 'cat',     shadow: 'shadow-cat' },
  Fish:    { className: 'fish',    shadow: null },
  Kid:     { className: 'kid',     shadow: 'kid-shadow' },
  Panda:   { className: 'panda',   shadow: 'panda-shadow' },
  Penguin: { className: 'penguin', shadow: 'penguin-shadow' },
  Rabbit:  { className: 'rabbit',  shadow: null },
  Tiger:   { className: 'tiger',   shadow: 'tiger-shadow' },
  Pig:     { className: 'pig',     shadow: 'pig-shadow' },
};

const ASSET_BASE_URL = '/images/animal';

export default function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState<{ email: string; username: string; avatar?: string } | null>(null);
  const [ownedAnimals, setOwnedAnimals] = useState<OwnedAnimal[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const { categories } = useCategories();
  const { tasks, toggleTask, deleteTask } = useTasks();

  const roomRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const updateRoomScale = useCallback(() => {
    if (!roomRef.current || !worldRef.current) return;
    const scale = Math.min(roomRef.current.clientWidth / 1440, roomRef.current.clientHeight / 810);
    worldRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateRoomScale);
    return () => window.removeEventListener('resize', updateRoomScale);
  }, [updateRoomScale]);

  useEffect(() => { updateRoomScale(); }, [updateRoomScale]);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      try {
        const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setUser(result.data);
      } catch (error) {
        console.error('Fetch user error:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchOwnedAnimals = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      try {
        const response = await fetch('/api/user-animals', { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setOwnedAnimals(result.data);
      } catch (error) {
        console.error('Fetch owned animals error:', error);
      }
    };
    fetchOwnedAnimals();
  }, []);

  useEffect(() => {
    setExpandedCategories(categories.map((c) => c.id));
  }, [categories]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleCategoryDropdown = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  return (
    <div className="home-page">
      <div className="main-content">
        <div className="body-container">
          <div className="room" ref={roomRef}>
            <div className="room-world" ref={worldRef}>
              <img src="/images/room.svg" className="room-background" />
              {ownedAnimals.map((animal) => {
                const layout = ANIMAL_LAYOUT[animal.name];
                if (!layout) return null;
                return (
                  <div className={layout.className} key={animal.name}>
                    {layout.shadow && <div className={layout.shadow}></div>}
                    <img src={`${ASSET_BASE_URL}/${animal.animation}`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="room-time">
            <div className="current-time">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="current-date">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
              {' | '}
              {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Today's Tasks</h2>
              <button className="btn-todo" onClick={() => navigate('/create-todo')}>
                <span>+</span>
              </button>
            </div>

            <TaskListSection
              categories={categories}
              tasks={tasks}
              expandedCategories={expandedCategories}
              onToggleCategory={toggleCategoryDropdown}
              onToggleTask={toggleTask}
              onEditTask={(task) => navigate(`/create-todo/${task.id}`)}
              onDeleteTask={deleteTask}
            />
          </div>
        </div>
      </div>
    </div>
  );
}