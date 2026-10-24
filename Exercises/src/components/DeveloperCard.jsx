import { Fragment, useId, useState } from 'react';
import SkillBadge from './SkillBadge.jsx';
import profileAvatar from '../assets/huong-avatar.png';
import styles from './DeveloperCard.module.css';

function getSafeAvatarUrl(avatarUrl) {
  if (avatarUrl === profileAvatar) {
    return profileAvatar;
  }

  if (typeof avatarUrl !== 'string' || !avatarUrl.trim()) {
    return '';
  }

  try {
    const url = new URL(avatarUrl);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export default function DeveloperCard({
  name = 'Huong Bui Nguyen Quynh',
  role = 'Frontend Developer & Pro-Gamer',
  avatarUrl = profileAvatar,
  metrics = {
    Projects: 12,
    'Years of experience': 2,
    'Matches won': 128,
  },
  skills = [
    { id: 'react', label: 'React 19' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'css', label: 'CSS' },
    { id: 'valorant', label: 'Valorant' },
  ],
}) {
  const headingId = useId();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null);
  const displayName = name.trim() || 'Developer';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toUpperCase();
  const avatarSrc = getSafeAvatarUrl(avatarUrl);

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <header className={styles.header}>
        {avatarSrc && avatarSrc !== failedAvatarUrl ? (
          <img
            className={styles.avatar}
            src={avatarSrc}
            alt={`Profile avatar for ${displayName}`}
            width={96}
            height={128}
            onError={() => setFailedAvatarUrl(avatarSrc)}
          />
        ) : (
          <span
            className={`${styles.avatar} ${styles.avatarFallback}`}
            role="img"
            aria-label={`Avatar initials for ${displayName}`}
          >
            {initials}
          </span>
        )}
        <h2 className={styles.name} id={headingId}>{displayName}</h2>
        {role && <p className={styles.role}>{role}</p>}
      </header>

      <dl className={styles.metrics}>
        {Object.entries(metrics).map(([label, value]) => (
          <Fragment key={label}>
            <dt className={styles.metricLabel}>{label}</dt>
            <dd className={styles.metricValue}>{value}</dd>
          </Fragment>
        ))}
      </dl>

      <ul className={styles.skills} aria-label="Skills">
        {skills.map((skill) => (
          <li className={styles.skillItem} key={skill.id}>
            <SkillBadge label={skill.label} className={styles.badge} />
          </li>
        ))}
      </ul>
    </article>
  );
}
