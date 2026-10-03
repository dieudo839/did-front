import { Link } from 'react-router-dom';
import { money } from '../../utils';
import type { ProductRank } from './types';

export function ClassementProduits({
  products,
  loading = false,
  error,
  onRetry,
}: {
  products: ProductRank[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const topQuantity = products[0]?.quantity || 0;

  return (
    <section className="dashboard-panel ranking-panel" aria-labelledby="ranking-title">
      <div className="dashboard-panel-heading">
        <div>
          <h3 id="ranking-title">Produits les plus vendus</h3>
          <p>Classement sur la période sélectionnée</p>
        </div>
      </div>
      {loading ? (
        <div className="ranking-skeleton" aria-label="Chargement du classement" role="status">
          {Array.from({ length: 5 }, (_, index) => (
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
        <p className="dashboard-empty">Aucune vente sur cette période.</p>
      ) : (
        <ol className="product-ranking">
          {products.map((product, index) => (
            <li key={product.id}>
              <span className="ranking-number">{index + 1}</span>
              <div className="ranking-product">
                <div className="ranking-product-line">
                  <span>{product.name}</span>
                  <span className="ranking-quantity">{product.quantity}</span>
                </div>
                <span
                  className="ranking-bar"
                  role="img"
                  aria-label={`${product.quantity} articles, ${money(product.revenue)}`}
                >
                  <span style={{ width: `${(product.quantity / topQuantity) * 100}%` }} />
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Link className="dashboard-panel-link" to="/produits">
        Voir tous les produits
      </Link>
    </section>
  );
}
