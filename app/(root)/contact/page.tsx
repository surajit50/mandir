import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <main className="pt-24 min-h-screen">
      <section className="py-24 max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Connect with Us</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Whether you have questions about our rituals, want to volunteer, or need assistance, our doors and hearts are always open.
            </p>
          </div>

          <div className="space-y-6">
            {[
              { icon: MapPin, title: "Address", content: "Kali Bari Road, South Sector, West Bengal, India" },
              { icon: Phone, title: "Phone", content: "+91 98300 12345" },
              { icon: Mail, title: "Email", content: "contact@maakalitrust.org" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground">{item.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted p-8 rounded-2xl border border-border">
            <h3 className="font-bold mb-2">Temple Hours</h3>
            <p className="text-sm text-muted-foreground">Morning: 6:00 AM - 12:30 PM</p>
            <p className="text-sm text-muted-foreground">Evening: 4:30 PM - 9:00 PM</p>
            <p className="text-xs text-primary font-medium mt-4 italic">*Special timings apply on Amavasya and Festival days.</p>
          </div>
        </div>

        <div className="bg-card border border-border p-8 md:p-10 rounded-3xl shadow-xl">
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <input className="w-full bg-muted border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="John" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <input className="w-full bg-muted border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <input className="w-full bg-muted border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <select className="w-full bg-muted border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option>General Inquiry</option>
                <option>Donation Query</option>
                <option>Ritual/Puja Booking</option>
                <option>Volunteering</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea rows={4} className="w-full bg-muted border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="How can we help you?" />
            </div>
            <Button className="w-full bg-primary text-white py-6 rounded-xl font-bold flex items-center justify-center gap-2">
              Send Message <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
