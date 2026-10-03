import type { ReactNode } from 'react';

export function SectionTitre({
  id,
  title,
  description,
  icon,
  count,
}: {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
  count?: number | null;
}) {
  return (
    <header className="dashboard-section-title">
      <div className="dashboard-section-title-main">
        {icon && (
          <span className="dashboard-section-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div>
          <h2 id={id}>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {count !== undefined && count !== null && (
        <span className="attention-count">
          {count} {count === 1 ? 'point à traiter' : 'points à traiter'}
        </span>
      )}
    </header>
  );
}
