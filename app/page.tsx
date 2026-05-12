import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Landmark, HandCoins, BookOpen, BarChart3 } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-background dark:via-background dark:to-background">
      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Hero */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-medium">
            <Landmark className="w-4 h-4" />
            Temple Trust Management
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight tracking-tight">
            Manage Your Temple
            <span className="text-emerald-600 dark:text-emerald-400"> Finances</span>{" "}
            with Confidence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Streamline donation collection, accounting, and financial management for your temple with transparency and ease.
          </p>

          <div className="flex gap-3 justify-center pt-4">
            <Link href="/auth/login">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="lg" variant="outline">
                Register
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
              <HandCoins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Donation Tracking</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Record and verify donation collections from members and donors with complete audit trails.
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-colors">
              <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Cash Management</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Monitor cash handovers, ledgers, and maintain detailed transaction records with running balances.
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
              <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Financial Reporting</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Generate comprehensive reports, reconcile bank accounts, and gain insights effortlessly.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
