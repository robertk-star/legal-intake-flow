import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin — Legal Intake Flow",
    template: "%s | Admin — Legal Intake Flow",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
