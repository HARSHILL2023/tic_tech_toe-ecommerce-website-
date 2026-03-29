import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Zap size={20} className="text-accent" />
              <span className="text-lg font-bold text-foreground">PriceIQ</span>
            </div>
            <p className="text-sm text-muted-foreground">Smart Prices. Smarter Picks.</p>
            <p className="text-xs text-muted-foreground">Powered by AI — Prices updated in real-time</p>
            <p className="text-xs text-muted-foreground italic">Built for Prama Innovations Hackathon 2026</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Categories</h4>
            <div className="space-y-2">
              {["Electronics", "Fashion", "Home & Kitchen", "Sports", "Beauty", "Books"].map((c) => (
                <Link key={c} to="/" className="block text-sm text-muted-foreground hover:text-accent transition-colors">{c}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">About</h4>
            <div className="space-y-2">
              {["How PriceIQ Works", "Dynamic Pricing Explained", "Recommendation Engine", "Fairness Policy"].map((l) => (
                <p key={l} className="text-sm text-muted-foreground hover:text-accent transition-colors cursor-pointer">{l}</p>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Info</h4>
            <div className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Contact Us", "API Documentation"].map((l) => (
                <p key={l} className="text-sm text-muted-foreground hover:text-accent transition-colors cursor-pointer">{l}</p>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">© 2026 PriceIQ · All prices are dynamic and update in real-time based on demand</p>
        </div>
      </div>
    </footer>
  );
}
