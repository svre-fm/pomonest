import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../collection.css';

interface CollectionProps {
  collection?: any[];
}

interface AnimalData {
  id: string;
  name: string;
  rarity: string;
  image: string;
  animation?: string;
  description?: string | null;
}

const DEFAULT_ANIMALS: AnimalData[] = [
  { id: '1', name: 'Kitty', rarity: 'Common', image: '/images/animal/cat.PNG' },
  { id: '2', name: 'Dobby', rarity: 'Common', image: '/images/animal/dog.PNG' },
  { id: '3', name: 'Bungbung', rarity: 'Common', image: '/images/animal/fish.PNG' },
  { id: '4', name: 'Pandy', rarity: 'Rare', image: '/images/animal/pan.PNG' },
  { id: '5', name: 'Pecky', rarity: 'Rare', image: '/images/animal/peng.PNG' },
  { id: '6', name: 'Tigga', rarity: 'Rare', image: '/images/animal/tiger.PNG' },
  { id: '7', name: 'Fatty', rarity: 'Epic', image: '/images/animal/pig.PNG' },
  { id: '8', name: 'Dimoo', rarity: 'Epic', image: '/images/animal/kid.PNG' },
  { id: '9', name: 'Snowy', rarity: 'Epic', image: '/images/animal/rab.PNG' },
];

const BASE_URL = '/images/animal';

function getAuthToken(): string | null {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('authToken')
  );
}

export default function Collection({ collection = [] }: CollectionProps) {
  const navigate = useNavigate();
  const [allAnimals, setAllAnimals] = useState<AnimalData[]>(DEFAULT_ANIMALS);
  const [unlockedAnimalIds, setUnlockedAnimalIds] = useState<Set<string>>(new Set());
  const [unlockedImages, setUnlockedImages] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    async function loadCollection() {
      const idSet = new Set<string>();
      const imgSet = new Set<string>();

      if (Array.isArray(collection)) {
        collection.forEach((item: any) => {
          if (typeof item === 'string') imgSet.add(item);
          if (item?.image) imgSet.add(item.image);
          if (item?.animalImage) imgSet.add(item.animalImage);
          if (item?.animalId) idSet.add(item.animalId);
        });
      }

      try {
        const cached = JSON.parse(
          localStorage.getItem('pomonest_unlocked_images') || '[]'
        );

        if (Array.isArray(cached)) {
          cached.forEach((img: string) => imgSet.add(img));
        }
      } catch (e) {}

      try {
        const token = getAuthToken();

        const animalsRes = await fetch(`/api/animals`);

        if (animalsRes.ok) {
          const animalsJson = await animalsRes.json();

          if (
            Array.isArray(animalsJson.data) &&
            animalsJson.data.length > 0
          ) {
            setAllAnimals(animalsJson.data);
          }
        }

        if (token) {
          const userRes = await authFetch('/api/user-animals', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (userRes.ok) {
            const userJson = await userRes.json();
            const records = userJson.data || [];

            records.forEach((item: any) => {
              if (item.animalId) idSet.add(item.animalId);
              if (item.animalImage) imgSet.add(item.animalImage);
              if (item.animal?.image) imgSet.add(item.animal.image);
            });
          }
        }
      } catch (err) {
        console.error('Failed to load collection from backend:', err);
      }

      setUnlockedAnimalIds(new Set(idSet));
      setUnlockedImages(new Set(imgSet));
    }

    loadCollection();
  }, []);

  return (
    <div
      style={{
        padding: '20px 36px',
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ส่วนหัว */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/home')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#ded65a',
            border: '2px solid #908339',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#7a593f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <h2 style={{ color: '#4a3320', margin: 0, fontSize: '20px' }}>Animal Index</h2>
        <div style={{ width: '40px' }} />
      </div>

      {/* ตารางแสดงสัตว์ทั้ง 9 ตัว */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          maxWidth: '820px',
          width: '100%',
          margin: '0 auto',
          paddingBottom: '20px',
        }}
      >
        {allAnimals.map((animal) => {
          const isUnlocked =
            unlockedAnimalIds.has(animal.id) || unlockedImages.has(animal.image);

          const rarityLower = animal.rarity.toLowerCase();

          return (
            <div
              key={animal.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '16px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                border: isUnlocked ? '2px solid #ded65a' : '2px solid transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  height: '85px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}
              >
                <img
                  src={`${BASE_URL}/${animal.image}`}
                  alt={isUnlocked ? animal.name : 'Locked'}
                  style={{
                    maxHeight: '75px',
                    maxWidth: '75px',
                    objectFit: 'contain',
                    filter: isUnlocked ? 'none' : 'brightness(0) opacity(0.55)',
                    transition: 'filter 0.3s ease',
                  }}
                />
              </div>
              <h3 style={{ margin: '4px 0', color: '#4a3320', fontSize: '15px' }}>
                {isUnlocked ? animal.name : '???'}
              </h3>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor:
                    rarityLower === 'epic'
                      ? '#f3e8ff'
                      : rarityLower === 'rare'
                      ? '#e0f2fe'
                      : '#fef9c3',
                  color:
                    rarityLower === 'epic'
                      ? '#7e22ce'
                      : rarityLower === 'rare'
                      ? '#0369a1'
                      : '#854d0e',
                }}
              >
                {rarityLower}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}