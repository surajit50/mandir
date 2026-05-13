import { Landmark, ChevronRight } from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="pt-24 min-h-screen">
      <section className="py-24 px-4 max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <div className="text-primary font-bold tracking-wider uppercase text-sm">Our Sacred History</div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">The Legacy of Maa Kali</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Founded in the heart of our community, the Shree Maa Kali Temple Trust has been a beacon of spiritual guidance and social service for generations. Our temple is not just a place of worship, but a center for cultural preservation and humanitarian efforts.
          </p>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Our Core Values</h3>
            <ul className="space-y-4">
              {[
                "Preservation of Vedic Traditions",
                "Selfless Service to Humanity (Seva)",
                "Spiritual Empowerment of the Community",
                "Ethical and Transparent Governance"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                  <div className="w-6 h-6 rounded-full bg-accent-gold/20 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-accent-gold" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-8 border-card">
          <Image
             src="/kali-hero.png"
             alt="Maa Kali Temple Legacy"
             fill
             className="object-cover"
          />
        </div>
      </section>
    </main>
  );
}
