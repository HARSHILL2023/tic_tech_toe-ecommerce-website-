import { Link, useLocation } from "react-router-dom";
import { Zap, Search, Sun, Moon, Heart, ShoppingCart, BarChart2, Menu, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { categories } from "@/data/products";
import { useState } from "react";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: string;
  onCategoryChange: (c: string) => void;
}

export default function Navbar({ searchQuery, onSearchChange, activeCategory, onCategoryChange }: NavbarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { cartCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLink = (to: string, label: string, icon: React.ReactNode) => (
    <Link
      to={to}
      className={`flex items-center gap-1 text-sm transition-colors hover:text-accent ${location.pathname === to ? "text-accent" : "text-muted-foreground"}`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between gap-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <Zap size={28} className="text-accent" />
          <span className="text-xl font-bold text-foreground">PriceIQ</span>
        </Link>

        {/* Search - Desktop */}
        <div className="hidden md:flex flex-1 max-w-lg relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products, brands, categories..."
            className="w-full rounded-lg border border-input bg-secondary pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Right icons - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={toggleTheme} className="text-muted-foreground hover:text-accent transition-colors p-1">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/wishlist" className="relative text-muted-foreground hover:text-destructive transition-colors p-1">
            <Heart size={20} />
            {wishlistItems.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {wishlistItems.length}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative text-muted-foreground hover:text-accent transition-colors p-1">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold animate-cart-bounce">
                {cartCount}
              </span>
            )}
          </Link>
          {navLink("/dashboard", "Dashboard", <BarChart2 size={20} />)}
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-muted-foreground p-1">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-4 animate-fade-in">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-input bg-secondary pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={toggleTheme} className="flex items-center gap-2 text-muted-foreground">
              {isDark ? <Sun size={20} /> : <Moon size={20} />} {isDark ? "Light Mode" : "Dark Mode"}
            </button>
            <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-muted-foreground">
              <Heart size={20} /> Wishlist ({wishlistItems.length})
            </Link>
            <Link to="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-muted-foreground">
              <ShoppingCart size={20} /> Cart ({cartCount})
            </Link>
            <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-muted-foreground">
              <BarChart2 size={20} /> Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Category pills */}
      {(location.pathname === "/" || location.pathname === "/wishlist") && (
        <div className="border-t border-border">
          <div className="container flex gap-2 py-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  activeCategory === cat
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "border border-border text-muted-foreground hover:border-accent hover:text-accent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
