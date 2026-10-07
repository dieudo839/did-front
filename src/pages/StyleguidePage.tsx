import { useState } from 'react';
import { Icon } from '../components/Icon';
import { CategoryField } from '../components/CategoryField';
import { ActiviteRecente } from './dashboard/ActiviteRecente';
import { ClassementProduits } from './dashboard/ClassementProduits';
import { EnteteDePage, SelecteurPeriode } from './dashboard/EnteteDePage';
import { GraphiqueCA } from './dashboard/GraphiqueCA';
import { IndicateurCle } from './dashboard/IndicateurCle';
import { ListeAlertesStock } from './dashboard/ListeAlertesStock';
import { SectionTitre } from './dashboard/SectionTitre';
import {
  Avatar,
  Button,
  CheckField,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  SelectField,
  Skeleton,
  Tag,
  Toast,
  ToggleField,
} from '../components/ui';

const colors = [
  ['Fond', 'color-page'],
  ['Surface', 'color-surface'],
  ['Texte principal', 'color-text'],
  ['Texte secondaire', 'color-secondary'],
  ['Bordure', 'color-border'],
  ['Accent', 'color-accent'],
  ['Accent léger', 'color-accent-soft'],
  ['Erreur', 'color-danger'],
  ['Avertissement', 'color-warning'],
  ['Fond d’attention', 'color-attention-background'],
  ['Bordure d’alerte', 'color-warning-border'],
  ['Barre de graphique', 'color-chart-bar'],
  ['Succès', 'color-success'],
];

export function StyleguidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [categorySample, setCategorySample] = useState('');

  return (
    <main className="styleguide">
      <header className="styleguide-header">
        <h1>Styleguide</h1>
        <p>Couleurs, typographie et composants de l’interface.</p>
      </header>

      <section className="styleguide-section" aria-labelledby="colors-heading">
        <h2 id="colors-heading">Couleurs</h2>
        <div className="styleguide-swatches">
          {colors.map(([label, token]) => (
            <div className="styleguide-swatch" key={token}>
              <span
                className="styleguide-swatch-sample"
                style={{ backgroundColor: `var(--${token})` }}
                aria-hidden="true"
              />
              <span>{label}</span>
              <code>--{token}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="styleguide-section" aria-labelledby="type-heading">
        <h2 id="type-heading">Typographie</h2>
        <div className="styleguide-type-scale">
          <p style={{ fontSize: 'var(--text-xs)' }}>12 · Légende</p>
          <p style={{ fontSize: 'var(--text-sm)' }}>13 · Libellé secondaire</p>
          <p style={{ fontSize: 'var(--text-base)' }}>14 · Texte courant</p>
          <p style={{ fontSize: 'var(--text-lg)' }}>16 · Texte mis en avant</p>
          <p style={{ fontSize: 'var(--text-xl)' }}>20 · Titre de section</p>
          <p className="styleguide-page-title" style={{ fontSize: 'var(--text-title)' }}>
            28 · Titre de page
          </p>
          <p className="amount">12 450 FCFA · 08:42</p>
          <p className="styleguide-section-note">DM Sans · graisses 400 et 600</p>
        </div>
      </section>

      <section className="styleguide-section" aria-labelledby="actions-heading">
        <h2 id="actions-heading">Actions et champs</h2>
        <div className="styleguide-row">
          <Button className="primary">Action principale</Button>
          <Button>Action secondaire</Button>
          <Button className="text-button">Texte seul</Button>
          <Button className="danger">Supprimer</Button>
          <Button className="small">Petit bouton</Button>
          <Button aria-label="Ajouter">
            <Icon name="plus" />
          </Button>
        </div>
        <div className="styleguide-grid">
          <div className="styleguide-control-sample">
            <Field
              label="Champ obligatoire"
              placeholder="Saisir une valeur"
              required
              help="Les champs marqués d’un astérisque doivent être renseignés."
            />
            <Field label="Avec erreur" error="Vérifiez cette valeur." defaultValue="Exemple" />
            <SelectField label="Sélection" defaultValue="a">
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </SelectField>
            <CheckField label="Case à cocher" defaultChecked />
            <ToggleField label="Interrupteur" defaultChecked />
          </div>
        </div>
      </section>

      <section className="styleguide-section" aria-labelledby="category-picker-heading">
        <h2 id="category-picker-heading">Sélecteur de catégorie</h2>
        <div className="styleguide-control-sample">
          <CategoryField value={categorySample} onChange={setCategorySample} />
        </div>
      </section>

      <section className="styleguide-section" aria-labelledby="data-heading">
        <h2 id="data-heading">Données et états</h2>
        <div className="styleguide-row">
          <Tag>Disponible</Tag>
          <Tag warning>Stock bas</Tag>
          <Tag danger>Inactif</Tag>
          <Avatar name="Awa Traoré" />
          <Toast>Modifications enregistrées.</Toast>
          <Toast tone="error">Enregistrement impossible.</Toast>
        </div>
        <div className="styleguide-table-sample">
          <DataTable headers={['ÉLÉMENT', 'QUANTITÉ', 'MONTANT']}>
            <tr>
              <td>Exemple</td>
              <td className="right amount">2</td>
              <td className="right amount">1 250 FCFA</td>
            </tr>
          </DataTable>
        </div>
        <div className="styleguide-grid">
          <div className="styleguide-state">
            <LoadingState label="Chargement en cours…" />
            <Skeleton />
          </div>
          <div className="styleguide-state">
            <EmptyState>Aucun élément à afficher.</EmptyState>
            <Button className="small">Ajouter un élément</Button>
          </div>
          <div className="styleguide-state">
            <ErrorState error="Impossible de charger les données." />
          </div>
        </div>
      </section>

      <section className="styleguide-section" aria-labelledby="ticket-heading">
        <h2 id="ticket-heading">Ticket</h2>
        <article className="styleguide-receipt" aria-label="Aperçu d’un ticket de caisse">
          <p>VENTE · 03/10/2026 · 08:30</p>
          <p>Article de démonstration</p>
          <div className="styleguide-receipt-total">
            <span>Total</span>
            <span>1 250 FCFA</span>
          </div>
        </article>
      </section>

      <section className="styleguide-section" aria-labelledby="dashboard-components-heading">
        <h2 id="dashboard-components-heading">Composants du tableau de bord</h2>
        <EnteteDePage dateLabel="" lastUpdated="—" onRefresh={() => undefined} refreshing={false} />
        <SectionTitre
          description="Ventes et activité sur la période sélectionnée"
          id="styleguide-performance-heading"
          title="Performance"
        />
        <div className="dashboard-indicators" aria-label="Aperçu des indicateurs">
          <IndicateurCle label="Chiffre d’affaires" loading value={null} variation={null} />
          <IndicateurCle label="Nombre d’achats" loading value={null} variation={null} />
          <IndicateurCle label="Panier moyen" loading value={null} variation={null} />
          <IndicateurCle label="Articles vendus" loading value={null} variation={null} />
        </div>
        <SelecteurPeriode onChange={() => undefined} period="7days" showDetailedPerformance />
        <div className="dashboard-performance-grid">
          <GraphiqueCA loading periodLabel="7 derniers jours" values={[]} />
          <ClassementProduits loading products={[]} />
        </div>
        <SectionTitre
          count={0}
          description="Éléments qui demandent une action"
          id="styleguide-attention-heading"
          title="À surveiller"
        />
        <div className="dashboard-attention-grid">
          <ListeAlertesStock loading products={[]} />
          <ActiviteRecente loading activities={[]} audience="team" />
        </div>
      </section>

      <section className="styleguide-section" aria-labelledby="dialog-heading">
        <h2 id="dialog-heading">Modale et icône</h2>
        <div className="styleguide-row">
          <Button onClick={() => setModalOpen(true)}>Ouvrir la modale</Button>
          <span aria-label="Recherche">
            <Icon name="search" />
          </span>
          <Icon name="menu" />
        </div>
      </section>

      {modalOpen && (
        <Modal title="Modale" onClose={() => setModalOpen(false)}>
          <p>Contenu de la fenêtre.</p>
          <Button className="primary" onClick={() => setModalOpen(false)}>
            Fermer
          </Button>
        </Modal>
      )}
    </main>
  );
}
