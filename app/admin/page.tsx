import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "Pengelolaan Katalog | DLA AC", robots: { index: false, follow: false } };

export default function AdminPage() { return <AdminDashboard />; }
