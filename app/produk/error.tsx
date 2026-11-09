"use client";

export default function ProductsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="route-state"><h1>Katalog belum dapat ditampilkan.</h1><p>Silakan coba lagi.</p><button className="button button-dark" type="button" onClick={reset}>Coba lagi</button></main>;
}
