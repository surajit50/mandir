import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Temple Trust Management",
  description: "Login or register to manage temple trust funds",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-background dark:via-background dark:to-background p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
