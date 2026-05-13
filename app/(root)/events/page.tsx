import { Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EventsPage() {
  const events = [
    { 
      title: "Maha Kali Puja", 
      date: "October 20, 2026", 
      desc: "The grandest celebration of the year with midnight rituals, mantras, and community offerings.",
      type: "Religious"
    },
    { 
      title: "Monthly Amavasya Puja", 
      date: "Next: June 15, 2026", 
      desc: "Special prayers and offerings on the new moon night to invoke the blessings of the Mother.",
      type: "Spiritual"
    },
    { 
      title: "Community Feast (Prasad)", 
      date: "August 05, 2026", 
      desc: "A day of selfless service and sharing blessed food with all devotees and the needy.",
      type: "Social"
    },
    { 
      title: "Annual Trust Meeting", 
      date: "June 02, 2026", 
      desc: "Transparency session for all members and well-wishers to discuss temple development.",
      type: "Administrative"
    }
  ];

  return (
    <main className="pt-24 min-h-screen bg-muted/30">
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Auspicious Events</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Stay updated with the sacred ceremonies, festivals, and community gatherings at the Shree Maa Kali Temple.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {events.map((event, i) => (
            <div key={i} className="bg-card border border-border p-8 rounded-2xl hover:shadow-2xl transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-primary font-bold">{event.date}</div>
                  <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
                    {event.type}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">{event.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{event.desc}</p>
              </div>
              <Button variant="outline" className="w-fit flex items-center gap-2 group-hover:bg-primary group-hover:text-white transition-all">
                Participate <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
