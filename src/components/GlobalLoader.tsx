import { useIsFetching } from '@tanstack/react-query';

export function GlobalLoader() {
  const isFetching = useIsFetching() > 0;

  if (!isFetching) {
    return null;
  }

  return (
    <div className="global-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="global-loader-mark" aria-hidden="true">
        <img src="/favicon.svg" alt="" />
        <span className="global-loader-ring">
          <span className="global-loader-dot" />
        </span>
      </div>
      <p>Chargement des données…</p>
    </div>
  );
}
