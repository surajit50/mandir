import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PublicNavbar } from "@/components/public-navbar";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar session={session} />
      {children}
      {/* Footer can also be moved here if it's common */}
    </div>
  );
}
