import { HandCoins, Users, Heart, Landmark, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DonationsPage() {
  return (
    <main className="pt-24 min-h-screen">
      {/* Hero Section */}
      <section className="py-24 bg-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Support Our Divine Mission</h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            Your contributions help us sustain the temple's spiritual mission and expand our outreach to the needy. Every drop counts.
          </p>
        </div>
      </section>

      {/* Donation Options */}
      <section className="py-24 max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
        {[
          {
            title: "Temple Upkeep",
            desc: "Help us maintain the sacred grounds, intricate carvings, and the divine sanctum of Maa Kali.",
            icon: Landmark
          },
          {
            title: "Annadan Program",
            desc: "Support our daily community kitchen that provides blessed meals to hundreds of devotees and the needy.",
            icon: HandCoins
          },
          {
            title: "Social Welfare",
            desc: "Fund our education and healthcare initiatives for the underprivileged members of our community.",
            icon: Heart
          }
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <item.icon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold">{item.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
            <Button className="w-full bg-primary text-white">Contribute Now</Button>
          </div>
        ))}
      </section>

      {/* Bank Details */}
      <section className="pb-24 max-w-4xl mx-auto px-4">
        <div className="bg-muted p-8 md:p-12 rounded-[2rem] border border-border space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Bank Transfer Details</h2>
            <p className="text-muted-foreground">For direct bank transfers and corporate donations.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account Information</div>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border/50 py-2">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-medium">Shree Maa Kali Temple Trust</span>
                </div>
                <div className="flex justify-between border-b border-border/50 py-2">
                  <span className="text-muted-foreground">Account Number:</span>
                  <span className="font-medium">1234 5678 9012</span>
                </div>
                <div className="flex justify-between border-b border-border/50 py-2">
                  <span className="text-muted-foreground">Bank Name:</span>
                  <span className="font-medium">State Bank of India</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">IFSC Code:</span>
                  <span className="font-medium">SBIN0001234</span>
                </div>
              </div>
            </div>
            
            <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-32 h-32 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border">
                <span className="text-xs text-muted-foreground px-4">QR Code Placeholder</span>
              </div>
              <p className="text-sm text-muted-foreground">Scan this QR code to donate instantly via UPI</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
