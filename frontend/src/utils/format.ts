// แปลงจำนวนวินาทีเป็นข้อความอ่านง่าย เช่น "3 h 25 m"
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} m`;
  if (seconds > 0 && m === 0) return '< 1 m';
  return `${m} m`;
}