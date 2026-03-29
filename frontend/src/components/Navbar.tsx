import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Zap, Search, Sun, Moon, Heart, ShoppingCart, BarChart2, Menu, X,
  Layers, Smartphone, Shirt, UtensilsCrossed, Dumbbell, Sparkles, BookOpen, Gamepad2,
  User, LogOut, LogIn, UserPlus, ChevronDown,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  { label: "All",            icon: <Layers size={14} /> },
  { label: "Electronics",    icon: <Smartphone size={14} /> },
  { label: "Fashion",        icon: <Shirt size={14} /> },
  { label: "Home & Kitchen", icon: <UtensilsCrossed size={14} /> },
  { label: "Sports",         icon: <Dumbbell size={14} /> },
  { label: "Beauty",         icon: <Sparkles size={14} /> },
  { label: "Books",          icon: <BookOpen size={14} /> },
  { label: "Toys",           icon: <Gamepad2 size={14} /> },
];

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: string;
  onCategoryChange: (c: string) => void;
}

export default function Navbar({ searchQuery, onSearchChange, activeCategory, onCategoryChange }: NavbarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { cartCount }           = useCart();
  const { items: wishlistItems }= useWishlist();
  const { user, isAuthenticated, signOut } = useAuth();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [avatarOpen, setAvatarOpen]   = useState(false);
  const location     = useLocation();
  const navigate     = useNavigate();
  const avatarRef    = useRef<HTMLDivElement>(null);

  // ── Local search state (debounced) ─────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(searchQuery || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearchInput(searchQuery || ""); }, [searchQuery]);
  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    onSearchChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        navigate(`/search?q=${encodeURIComponent(value.trim())}`);
      }, 300);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInput.trim()) navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    onSearchChange("");
  };

  const handleSignOut = () => {
    signOut();
    setAvatarOpen(false);
    setMobileOpen(false);
    toast.success("Signed out successfully");
    navigate("/");
  };

  // User initials for avatar
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const navLink = (to: string, label: string, icon: React.ReactNode) => (
    <Link
      to={to}
      className={`flex items-center gap-1 text-sm transition-colors hover:text-accent ${location.pathname === to ? "text-accent" : "text-muted-foreground"}`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );

  const showCategoryBar = location.pathname === "/" || location.pathname === "/wishlist";
  // Hide Navbar on auth pages (they have their own full-screen layout)
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  if (isAuthPage) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between gap-4 py-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <Zap size={28} className="text-accent" />
          <span className="text-xl font-bold text-foreground">PriceIQ</span>
        </Link>

        {/* Search — Desktop */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg relative items-center">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            id="navbar-search"
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            placeholder="Search Amazon + Flipkart products..."
            autoComplete="off"
            className="w-full rounded-l-lg border border-input bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {searchInput && (
            <button type="button" onClick={handleClear} className="absolute right-20 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
          <button type="submit"
            className="shrink-0 bg-accent text-accent-foreground px-4 py-2 rounded-r-lg text-sm font-semibold hover:opacity-90 transition-opacity border border-accent">
            Search
          </button>
        </form>

        {/* Right — Desktop */}
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

          {/* ── Auth: Avatar dropdown (logged in) OR buttons (guest) ── */}
          {isAuthenticated ? (
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen(v => !v)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-1 hover:border-accent/60 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <span className="hidden lg:block text-xs font-medium text-foreground max-w-[80px] truncate">
                  {user?.name?.split(" ")[0]}
                </span>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${avatarOpen ? "rotate-180" : ""}`} />
              </button>

              {avatarOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-fade-in z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    {[
                      { to: "/wishlist",   icon: <Heart size={14} />,    label: "Wishlist" },
                      { to: "/dashboard",  icon: <BarChart2 size={14} />, label: "Dashboard" },
                    ].map(item => (
                      <Link key={item.to} to={item.to}
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        {item.icon} {item.label}
                      </Link>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors px-2 py-1">
                <LogIn size={16} /> Sign In
              </Link>
              <Link to="/signup"
                className="flex items-center gap-1.5 text-sm bg-accent text-accent-foreground px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                <UserPlus size={14} /> Join free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-muted-foreground p-1">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-4 animate-fade-in">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={handleInputChange}
              placeholder="Search products..."
              autoComplete="off"
              className="w-full rounded-lg border border-input bg-secondary pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </form>
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

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 py-1 border-t border-border mt-1">
                  <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-muted-foreground">
                  <BarChart2 size={20} /> Dashboard
                </Link>
                <button onClick={handleSignOut} className="flex items-center gap-2 text-destructive">
                  <LogOut size={20} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-muted-foreground">
                  <LogIn size={20} /> Sign In
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 bg-accent text-accent-foreground rounded-lg py-2 font-semibold text-sm">
                  <UserPlus size={16} /> Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Category pills */}
      {showCategoryBar && (
        <div className="border-t border-border">
          <div className="container flex gap-2 py-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => onCategoryChange(cat.label)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.label
                    ? "bg-accent text-accent-foreground shadow-sm shadow-accent/30"
                    : "border border-border text-muted-foreground hover:border-accent/60 hover:text-accent"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
