import { useState, useRef, useEffect } from "react";
import { Bot, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { products } from "@/data/products";
import type { Product } from "@/data/products";

interface Message {
  role: "user" | "bot";
  text?: string;
  products?: Product[];
}

const quickReplies = ["Best deals today", "Electronics under 5,000", "Top rated products", "What's trending"];

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi! I'm your smart shopping assistant. Tell me what you're looking for and your budget — I'll find the best deals for you." },
  ]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const getResponse = (q: string): { text: string; prods: Product[] } => {
    const lower = q.toLowerCase();
    if (lower.includes("headphone") || lower.includes("audio"))
      return { text: "Here are the best audio products for you:", prods: products.filter((p) => p.name.toLowerCase().includes("headphone") || p.name.toLowerCase().includes("rockerz") || p.name.toLowerCase().includes("boat")) };
    if (lower.includes("budget") || lower.includes("cheap") || lower.includes("under"))
      return { text: "Great picks on a budget:", prods: [...products].sort((a, b) => a.livePrice - b.livePrice).slice(0, 3) };
    if (lower.includes("trending") || lower.includes("popular"))
      return { text: "Here's what's trending right now:", prods: products.filter((p) => p.priceReason === "High Demand").slice(0, 3) };
    if (lower.includes("best deal") || lower.includes("deal"))
      return { text: "Today's best deals:", prods: [...products].sort((a, b) => b.discount - a.discount).slice(0, 3) };
    if (lower.includes("electronic") && lower.includes("5"))
      return { text: "Electronics under 5,000:", prods: products.filter((p) => p.category === "Electronics" && p.livePrice < 5000) };
    if (lower.includes("top rated") || lower.includes("rated"))
      return { text: "Top rated products:", prods: [...products].sort((a, b) => b.rating - a.rating).slice(0, 3) };
    return { text: "Here are today's best deals:", prods: products.sort(() => Math.random() - 0.5).slice(0, 3) };
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const { text: reply, prods } = getResponse(text);
      setMessages((prev) => [...prev, { role: "bot", text: reply, products: prods }]);
      setTyping(false);
    }, 1500);
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-110"
          title="Ask PriceIQ AI"
        >
          <Bot size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[520px] rounded-xl border border-border bg-background shadow-2xl flex flex-col animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-accent" />
              <span className="font-bold text-card-foreground text-sm">PriceIQ Assistant</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success pulse-dot" />
                <span className="text-[11px] text-muted-foreground">Online</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "bot" && (
                  <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center mr-2 shrink-0 mt-1">
                    <Bot size={14} className="text-accent" />
                  </div>
                )}
                <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "rounded-tl-2xl rounded-l-2xl rounded-br-sm bg-accent text-accent-foreground px-3 py-2" : "rounded-tr-2xl rounded-r-2xl rounded-bl-sm bg-card text-card-foreground px-3 py-2 border border-border"}`}>
                  {msg.text && <p className="text-sm">{msg.text}</p>}
                  {msg.products?.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-md bg-secondary p-2">
                      <img src={p.images[0]} alt={p.name} className="w-[52px] h-[52px] rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-foreground line-clamp-2">{p.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-bold text-success">₹{p.livePrice.toLocaleString("en-IN")}</span>
                          <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground font-bold">-{p.discount}%</span>
                        </div>
                      </div>
                      <button onClick={() => { navigate(`/product/${p.id}`); setOpen(false); }}
                        className="shrink-0 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground">View</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center"><Bot size={14} className="text-accent" /></div>
                <div className="flex gap-1 bg-card border border-border rounded-2xl px-4 py-3">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="h-2 w-2 rounded-full bg-muted-foreground" style={{ animation: `bounce-dot 0.6s ${delay}ms infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {quickReplies.map((q) => (
                <button key={q} onClick={() => send(q)} className="rounded-full border border-accent text-accent px-3 py-1 text-[11px] font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask me anything..."
              className="flex-1 rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button onClick={() => send(input)} className="rounded-lg bg-accent p-2 text-accent-foreground"><Send size={18} /></button>
          </div>
        </div>
      )}
    </>
  );
}
