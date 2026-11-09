import { Boxes, CircleCheck, Clock3, MessagesSquare, type LucideIcon } from "lucide-react";
import { statusLabels, stockStatuses, type Lot } from "@/lib/lots";

const statusIcons: Record<Lot["status"], LucideIcon> = {
  "perlu-konfirmasi": Clock3,
  tersedia: Boxes,
  "dalam-penawaran": MessagesSquare,
  terjual: CircleCheck,
};

export function CatalogSummary({ lots }: { lots: Lot[] }) {
  const exampleCount = lots.filter((lot) => lot.isExample).length;

  return (
    <section className="admin-summary" aria-labelledby="catalog-summary-title">
      <div className="admin-summary-heading">
        <div><span className="admin-kicker">PANTAU KATALOG</span><h2 id="catalog-summary-title">Ringkasan katalog<span>.</span></h2></div>
        <span className="admin-summary-count">{lots.length} LOT</span>
        <p>{lots.length} lot secara keseluruhan, termasuk {exampleCount} data contoh yang belum dikonfirmasi.</p>
      </div>
      <dl className="admin-summary-grid">
        {stockStatuses.map((status) => {
          const statusLots = lots.filter((lot) => lot.status === status);
          const statusExamples = statusLots.filter((lot) => lot.isExample).length;
          const Icon = statusIcons[status];
          return (
            <div className={`admin-summary-card admin-summary-${status}`} key={status}>
              <dt><span>{statusLabels[status]}</span><span className="admin-summary-icon"><Icon size={17} aria-hidden="true" /></span></dt>
              <dd><strong>{statusLots.length}</strong> lot <small>{statusExamples} data contoh</small></dd>
            </div>
          );
        })}
      </dl>
      <p className="admin-summary-note">Angka menunjukkan jumlah lot berdasarkan status katalog, bukan jumlah unit atau transaksi.</p>
    </section>
  );
}
