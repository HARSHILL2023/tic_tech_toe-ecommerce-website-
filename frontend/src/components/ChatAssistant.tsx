import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Send, ShoppingCart, ChevronRight } from 'lucide-react';
import { useProducts } from '@/contexts/ProductContext';
import { useCart } from '@/contexts/CartContext';
import type { Product } from '@/contexts/ProductContext';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  products?: Product[];
  timestamp: Date;
}

// ── Mini Product Card (shown inside chat messages) ────────────────────────────
interface MiniProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

function MiniProductCard({ product, onAddToCart }: MiniProductCardProps) {
  const navigate = useNavigate();

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/placeholder-product.svg';
  };

  return (
    <div className="flex gap-3 bg-gray-700/50 rounded-xl p-2.5 border border-gray-600/50 hover:border-orange-500/30 transition-colors">
      {/* Product Image */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
        <img
          src={product.images?.[0] || '/placeholder-product.svg'}
          alt={product.name}
          className="w-full h-full object-contain p-1"
          loading="lazy"
          onError={handleImageError}
        />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2 mb-1">
          {product.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-sm font-bold">
            ₹{product.livePrice.toLocaleString('en-IN')}
          </span>
          <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-medium">
            -{product.discount}%
          </span>
        </div>
        <p className="text-gray-500 text-xs line-through">
          ₹{product.mrp.toLocaleString('en-IN')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-1 flex-shrink-0 justify-center">
        <button
          onClick={() => navigate(`/product/${product.id}`)}
          className="px-2.5 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 font-medium"
        >
          View
          <ChevronRight size={10} />
        </button>
        <button
          onClick={() => onAddToCart(product)}
          className="px-2.5 py-1 text-xs border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-1"
        >
          <ShoppingCart size={10} />
          Add
        </button>
      </div>
    </div>
  );
}

// ── Main ChatAssistant Component ─────────────────────────────────────────────
export default function ChatAssistant() {
  const { products } = useProducts();
  const { addToCart: addToCartFn } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'bot',
      text: "Hi! I'm your PriceIQ shopping assistant. Tell me what you're looking for and your budget — I'll find the best live deals for you.",
      products: undefined,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Smart keyword response ──────────────────────────────────────────────────
  const getResponse = (query: string): { text: string; products: Product[] } => {
    const q = query.toLowerCase();
    let matched: Product[] = [];
    let responseText = '';

    if (q.includes('headphone') || q.includes('audio') || q.includes('earphone') || q.includes('sound')) {
      matched = products
        .filter(
          (p) =>
            p.name.toLowerCase().includes('headphone') ||
            p.name.toLowerCase().includes('rockerz') ||
            (p.category === 'Electronics' && p.name.toLowerCase().includes('boat'))
        )
        .slice(0, 3);
      responseText = `Found ${matched.length} great audio products for you. The Sony WH-1000XM5 is our top pick with industry-leading noise cancellation.`;
    } else if (q.includes('phone') || q.includes('mobile') || q.includes('iphone') || q.includes('smartphone')) {
      matched = products
        .filter((p) => p.name.toLowerCase().includes('iphone') || p.name.toLowerCase().includes('phone'))
        .slice(0, 3);
      responseText = 'Here are the best smartphones available right now with live pricing.';
    } else if (q.includes('budget') || q.includes('cheap') || q.includes('affordable') || q.includes('under')) {
      const matchNum = q.match(/under\s*(\d+)/i) || q.match(/below\s*(\d+)/i);
      const budget = matchNum ? parseInt(matchNum[1]) : 2000;
      matched = [...products]
        .filter((p) => p.livePrice <= budget)
        .sort((a, b) => a.livePrice - b.livePrice)
        .slice(0, 3);
      responseText =
        matched.length > 0
          ? `Found ${matched.length} products under ₹${budget.toLocaleString('en-IN')} — all at live dynamic prices.`
          : `No products found under ₹${budget.toLocaleString('en-IN')}. Here are our most affordable options:`;
      if (matched.length === 0) {
        matched = [...products].sort((a, b) => a.livePrice - b.livePrice).slice(0, 3);
      }
    } else if (q.includes('electronic') || q.includes('tech') || q.includes('gadget') || q.includes('tv') || q.includes('television')) {
      matched = products
        .filter((p) => p.category === 'Electronics')
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 3);
      responseText = 'Top Electronics deals right now — prices updated in real-time based on demand.';
    } else if (
      q.includes('fashion') || q.includes('shoe') || q.includes('cloth') || q.includes('wear') ||
      q.includes('jean') || q.includes('shirt') || q.includes('puma') || q.includes('nike') || q.includes('adidas')
    ) {
      matched = products
        .filter((p) => p.category === 'Fashion' || p.category === 'Sports')
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 3);
      responseText = 'Trending fashion and sports picks with the best discounts today.';
    } else if (q.includes('book') || q.includes('read') || q.includes('novel') || q.includes('self help')) {
      matched = products
        .filter((p) => p.category === 'Books')
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 3);
      responseText = 'Great books at amazing prices — perfect for building new habits.';
    } else if (
      q.includes('beauty') || q.includes('makeup') || q.includes('skin') ||
      q.includes('serum') || q.includes('foundation') || q.includes('lip')
    ) {
      matched = products
        .filter((p) => p.category === 'Beauty')
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 3);
      responseText = 'Top beauty products with live pricing — grab them before prices change.';
    } else if (
      q.includes('kitchen') || q.includes('home') || q.includes('cook') ||
      q.includes('vacuum') || q.includes('mixer') || q.includes('grinder')
    ) {
      matched = products
        .filter((p) => p.category === 'Home & Kitchen')
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 3);
      responseText = 'Best home & kitchen deals available right now.';
    } else if (
      q.includes('fitness') || q.includes('gym') || q.includes('sport') ||
      q.includes('workout') || q.includes('yoga') || q.includes('dumbbell')
    ) {
      matched = products
        .filter((p) => p.category === 'Sports')
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 3);
      responseText = 'Top fitness gear to upgrade your workout routine.';
    } else if (
      q.includes('trend') || q.includes('popular') || q.includes('best') ||
      q.includes('top') || q.includes('deal') || q.includes('offer')
    ) {
      matched = [...products].sort((a, b) => b.discount - a.discount).slice(0, 3);
      responseText = "Today's hottest deals — prices updating live based on demand surges.";
    } else if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('hii')) {
      return {
        text: "Hey there! I'm PriceIQ's AI shopping assistant. I can help you find the best deals, compare prices, or search by category or budget. What are you looking for today?",
        products: [],
      };
    } else if (q.includes('thank') || q.includes('thanks')) {
      return {
        text: "You're welcome! Happy shopping on PriceIQ. Remember, prices update in real-time — act fast on deals you like!",
        products: [],
      };
    } else {
      matched = [...products].sort((a, b) => b.discount - a.discount).slice(0, 3);
      responseText = "Here are today's best deals on PriceIQ — live prices, updated every 45 seconds.";
    }

    return { text: responseText, products: matched };
  };

  // ── Add to cart ─────────────────────────────────────────────────────────────
  const handleAddToCart = (product: Product) => {
    addToCartFn(product);
    toast.success(`${product.name.substring(0, 25)}... added to cart!`);
  };

  // ── Send handler ────────────────────────────────────────────────────────────
  const handleSend = async (queryText?: string) => {
    const text = (queryText ?? inputValue).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { text: responseText, products: responseProducts } = getResponse(text);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'bot',
      text: responseText,
      products: responseProducts.length > 0 ? responseProducts : undefined,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="absolute bottom-16 right-0 w-[360px] h-[520px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ animation: 'slideUp 0.25s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-orange-500" />
              <span className="font-semibold text-white text-sm">PriceIQ Assistant</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400">Online</span>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={14} className="text-orange-500" />
                  </div>
                )}
                <div className="max-w-[80%] space-y-2">
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-orange-500 text-white rounded-tr-sm'
                        : 'bg-gray-800 text-gray-100 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.role === 'bot' && msg.products && msg.products.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {msg.products.map((product) => (
                        <MiniProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-orange-500" />
                </div>
                <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 flex-shrink-0">
              {['Best deals today', 'Electronics under 5000', 'Top rated products', 'Budget picks'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="text-xs px-3 py-1.5 rounded-full border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="px-4 py-3 border-t border-gray-700 bg-gray-800 flex-shrink-0">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about any product or budget..."
                className="flex-1 bg-gray-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-transparent focus:border-orange-500/50 placeholder:text-gray-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Send message"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:scale-105 transition-all duration-200"
        aria-label="Open PriceIQ AI Assistant"
        title="Ask PriceIQ AI"
      >
        {isOpen ? <X size={24} className="text-white" /> : <Bot size={24} className="text-white" />}
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
