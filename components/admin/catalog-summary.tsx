import { statusLabels, stockStatuses, type Lot } from "@/lib/lots";

export function CatalogSummary({ lots }: { lots: Lot[] }) {
  const exampleCount = lots.filter((lot) => lot.isExample).length;

  return (
    <section className="admin-summary" aria-labelledby="catalog-summary-title">
      <div className="admin-summary-heading">
        <h2 id="catalog-summary-title">Ringkasan katalog</h2>
        <p>{lots.length} lot secara keseluruhan, termasuk {exampleCount} data contoh yang belum dikonfirmasi.</p>
      </div>
      <dl className="admin-summary-grid">
        {stockStatuses.map((status) => {
          const statusLots = lots.filter((lot) => lot.status === status);
          const statusExamples = statusLots.filter((lot) => lot.isExample).length;
          return (
            <div className="admin-summary-card" key={status}>
              <dt>{statusLabels[status]}</dt>
              <dd><strong>{statusLots.length}</strong> lot <small>{statusExamples} data contoh</small></dd>
            </div>
          );
        })}
      </dl>
      <p className="admin-summary-note">Angka menunjukkan jumlah lot berdasarkan status katalog, bukan jumlah unit atau transaksi.</p>
    </section>
  );
}
