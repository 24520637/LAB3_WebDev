import DeveloperCard from './components/DeveloperCard.jsx';
import profileAvatar from './assets/huong-avatar.png';

const profile = {
  name: 'Huong Bui Nguyen Quynh',
  role: 'Frontend Developer & Pro-Gamer',
  avatarUrl: profileAvatar,
  metrics: {
    Projects: 12,
    'Years of experience': 2,
    'Matches won': 128,
  },
  skills: [
    { id: 'react', label: 'React 19' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'css', label: 'CSS' },
    { id: 'valorant', label: 'Valorant' },
  ],
};

export default function App() {
  return (
    <main>
      <h1>Developer Profile</h1>
      <DeveloperCard {...profile} />
    </main>
  );
}
