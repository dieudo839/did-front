import type { Ticket } from '../types';
import { money } from '../utils';

export function Receipt({ ticket }: { ticket: Ticket }) {
  return (
    <article className="receipt">
      <div className="receipt-head">
        <b>GESTION BOUTIQUE</b>
        <span>REÇU DE PAIEMENT</span>
        <span>{new Date(ticket.dateAchat).toLocaleString('fr-FR')}</span>
        <span>Vendeur · {ticket.vendeur}</span>
        <span>{ticket.client}</span>
      </div>
      <div className="receipt-lines">
        {ticket.lignes.map((line, index) => (
          <div key={`${line.produitId}-${index}`}>
            <span>
              {line.produit}
              <small>
                {line.quantite} × {money(line.prixUnitaire)}
              </small>
            </span>
            <b>{money(line.sousTotal)}</b>
          </div>
        ))}
      </div>
      <div className="receipt-total">
        <span>TOTAL</span>
        <b>{money(ticket.total)}</b>
      </div>
      <div className="barcode" aria-hidden="true">
        ▌▌▏▌▌▌▏▏▌▌▏▌▏▌▌▌▏
      </div>
      <p className="receipt-thanks">FIN DU REÇU</p>
    </article>
  );
}
