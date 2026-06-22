import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, RotateCcw } from "lucide-react";
import { tutorApi } from "@/api/endpoints";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
}

export default function TutorChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "model",
      text: "¡Hola! Soy el **Profesor Ohm** 🤖⚡. Tu tutor virtual de electrónica. ¿En qué puedo ayudarte hoy?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const historyForApi = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await tutorApi.chat(historyForApi, userMsg.text);
      
      const modelMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "model", 
        text: response.data.reply 
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "model", 
        text: "Hubo un error de conexión con mi cerebro artificial. Por favor, intenta de nuevo." 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([{
      id: Date.now().toString(),
      role: "model",
      text: "¡Sesión reiniciada! ¿Qué nueva duda de electrónica tienes?"
    }]);
  };

  // Función básica para renderizar markdown sencillo (negritas)
  const renderText = (text: string) => {
    // Reemplaza **texto** por <strong>texto</strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-blue-900">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Bot size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Profesor Ohm</h3>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> En línea
            </p>
          </div>
        </div>
        <button 
          onClick={handleReset}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Reiniciar conversación"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-indigo-100 text-indigo-600" : "bg-blue-100 text-blue-600"
            }`}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
              msg.role === "user" 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white text-gray-700 border border-gray-100 rounded-tl-none"
            }`}>
              <div className={`whitespace-pre-wrap ${msg.role === "user" ? "text-indigo-50" : "text-gray-600"}`}>
                {renderText(msg.text)}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 flex-row">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex gap-1.5 items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Pregunta sobre voltaje, transistores, Arduino..."
            className="w-full pl-5 pr-14 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
