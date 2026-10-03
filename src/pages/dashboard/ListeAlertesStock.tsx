import { Link } from 'react-router-dom';
import type { StockAlert } from './types';

export function ListeAlertesStock({
  products,
  loading = false,
  error,
  onRetry,
}: {
  products: StockAlert[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="dashboard-panel stock-alert-panel" aria-labelledby="stock-alert-title">
      <div className="dashboard-panel-heading">
        <div>
          <h3 id="stock-alert-title">Stock bas et ruptures</h3>
          <p>Produits au seuil d’alerte ou en rupture</p>
        </div>
      </div>
      {loading ? (
        <div className="stock-skeleton" aria-label="Chargement des alertes" role="status">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="dashboard-skeleton-row" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="dashboard-block-error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button className="button" onClick={onRetry} type="button">
              Réessayer
            </button>
          )}
        </div>
      ) : products.length === 0 ? (
        <p className="stock-clear">Rien à signaler. Le stock est au-dessus des seuils.</p>
      ) : (
        <div className="stock-alert-list">
          {products.slice(0, 6).map((product) => (
            <div className="stock-alert-row" key={product.id}>
              <span className="stock-alert-name">{product.nom}</span>
              <span className="stock-alert-quantity">
                {product.stockActuel} <span>stock</span>
              </span>
              <span className="stock-alert-threshold">
                {product.seuilAlerte} <span>seuil</span>
              </span>
              <span className={`stock-alert-badge stock-alert-${product.alertType}`}>
                {product.alertType === 'out' ? 'Rupture' : 'Bas'}
              </span>
              <Link className="stock-replenish-link" to="/arrivages">
                Réapprovisionner
              </Link>
            </div>
          ))}
        </div>
      )}
      <Link className="dashboard-panel-link" to="/produits">
        Voir tout le stock bas
      </Link>
    </section>
  );
}
