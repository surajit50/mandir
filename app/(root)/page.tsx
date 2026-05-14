import { Button } from "@/components/ui/button";
import { 
  Landmark, 
  ChevronRight, 
  Users, 
  Calendar, 
  Heart,
  Mail,
  Phone,
  MapPin,
  HandCoins
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/1000055618.webp"
            alt="Maa Kali Temple"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background z-10" />
        </div>

        <div className="relative z-20 max-w-5xl mx-auto px-4 text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground backdrop-blur-md px-6 py-2 rounded-full text-sm font-semibold border border-primary/30">
            <Landmark className="w-4 h-4" />
            Shree Maa Kali Temple Trust
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
            Divine <span className="text-primary italic">Protection</span>, <br />
            Eternal <span className="text-accent-gold italic">Devotion</span>
          </h1>
          
          <p className="text-xl text-zinc-200 max-w-2xl mx-auto leading-relaxed">
            Experience the divine grace of Maa Kali. Join our mission to preserve the sacred traditions and serve the community under Her guidance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link href="#donations">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-7 rounded-xl shadow-2xl shadow-primary/40 group">
                Support the Temple
                <Heart className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm text-lg px-8 py-7 rounded-xl">
                Our History
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce z-20">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
            <div className="w-1 h-2 bg-white rounded-full" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-30 -mt-16 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Daily Devotees", value: "3,500+", icon: Users },
            { label: "Centuries of Faith", value: "250+", icon: Landmark },
            { label: "Sacred Festivals", value: "15+", icon: Calendar },
            { label: "Charity Projects", value: "60+", icon: Heart },
          ].map((stat, i) => (
            <div key={i} className="bg-card/50 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl flex flex-col items-center text-center group hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-4 max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <div className="text-primary font-bold tracking-wider uppercase text-sm">Our Legacy</div>
          <h2 className="text-4xl font-bold text-foreground tracking-tight">A Sanctuary of Spiritual Power</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The Shree Maa Kali Temple has stood as a symbol of divine energy and protection for over two centuries. Our trust is dedicated to maintaining the sacred traditions of Kali worship while fostering community welfare.
          </p>
          <ul className="space-y-4">
            {[
              "Daily Maa Kali Puja and Arati",
              "Annual Kali Puja and Diwali Mahotsav",
              "Community Empowerment and Education",
              "Sacred Garden and Temple Upkeep"
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
        <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border-8 border-card">
          <Image
             src="/kali-hero.png"
             alt="Maa Kali Temple Interior"
             fill
             className="object-cover"
          />
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-foreground">Auspicious Gatherings</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Participate in our upcoming ceremonies and celebrate the divine presence of the Mother.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Maha Kali Puja", date: "October 20, 2026", desc: "The grandest celebration of the year with midnight rituals." },
              { title: "Monthly Amavasya Puja", date: "Next: June 15, 2026", desc: "Special prayers and offerings on the new moon night." },
              { title: "Community Feast", date: "August 05, 2026", desc: "A day of service and sharing blessed food (Prasad)." },
            ].map((event, i) => (
              <div key={i} className="bg-card border border-border p-8 rounded-2xl hover:shadow-2xl transition-all group">
                <div className="text-primary font-bold mb-2">{event.date}</div>
                <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors">{event.title}</h3>
                <p className="text-muted-foreground mb-6">{event.desc}</p>
                <Button variant="link" className="p-0 text-primary group-hover:translate-x-2 transition-transform">
                  Learn More <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donations Section */}
      <section id="donations" className="py-24">
        <div className="max-w-7xl mx-auto px-4 bg-primary rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-gold/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center text-white">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">Your Support, Her Grace</h2>
              <p className="text-primary-foreground/90 text-lg leading-relaxed">
                Your contributions help us sustain the temple's spiritual mission and expand our outreach to the needy.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button className="bg-white text-primary hover:bg-zinc-100 px-8 py-6 rounded-xl text-lg font-bold">
                  Donate Online
                </Button>
                <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 px-8 py-6 rounded-xl text-lg font-bold">
                  Bank Transfer
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                <HandCoins className="w-10 h-10 mb-4" />
                <div className="font-bold">Transparent</div>
                <div className="text-sm text-white/70">Fully audited tracking</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                <Users className="w-10 h-10 mb-4" />
                <div className="font-bold">Impactful</div>
                <div className="text-sm text-white/70">Directly serves community</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-card border-t border-border pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Maa Kali Trust</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Preserving divine heritage and serving humanity since the late 19th century.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#home" className="hover:text-primary">Home</Link></li>
              <li><Link href="/about" className="hover:text-primary">Our Story</Link></li>
              <li><Link href="/events" className="hover:text-primary">Events</Link></li>
              <li><Link href="/donations" className="hover:text-primary">Donations</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold">Connect</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Kali Bari Road, South Sector</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> +91 98300 12345</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> contact@maakalitrust.org</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold">Stay Informed</h4>
            <p className="text-sm text-muted-foreground">Subscribe to our spiritual newsletter.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="bg-muted border border-border px-4 py-2 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button size="sm" className="bg-primary text-white">Join</Button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 pt-10 border-t border-border flex flex-col md:row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© 2026 Shree Maa Kali Temple Trust. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary">Terms of Service</Link>
            <Link href="/auth/login" className="hover:text-primary font-semibold">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
