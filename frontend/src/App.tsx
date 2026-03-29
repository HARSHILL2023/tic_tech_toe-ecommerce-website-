import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { ProductProvider } from "@/contexts/ProductContext";
import ScrollToTop from "@/components/ScrollToTop";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatAssistant from "@/components/ChatAssistant";
import Home from "@/pages/Home";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Wishlist from "@/pages/Wishlist";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProductProvider>
          <CartProvider>
            <WishlistProvider>
              <TooltipProvider>
                <Sonner />
                <BrowserRouter>
                  <ScrollToTop />
                  <div className="flex flex-col min-h-screen">
                    <Navbar
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      activeCategory={activeCategory}
                      onCategoryChange={setActiveCategory}
                    />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<Home searchQuery={searchQuery} activeCategory={activeCategory} />} />
                        <Route path="/product/:id" element={<ProductDetail />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                    <Footer />
                    <ChatAssistant />
                  </div>
                </BrowserRouter>
              </TooltipProvider>
            </WishlistProvider>
          </CartProvider>
        </ProductProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
