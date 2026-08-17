import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReimburseIt | Community Dreams Foundation",
  description: "Submit and track expense reimbursement requests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-transparent text-neutral-100">
        {children}
      </body>
    </html>
  );
}
