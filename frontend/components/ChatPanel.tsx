import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ChatUsedReport } from '../types';
import { sendMessage, getChatHistory, clearChatHistory } from '../services/chat.service';
import { BrandMark } from './SalesdigBrand';

const SUGGESTIONS = [
  'Which company has the best GenAI opportunity?',
  'Summarise the latest analysis',
  'Who are the key decision makers?',
];

export const ChatPanel: React.FC<{ primaryColor?: string }> = ({ primaryColor = '#0f766e' }) => {
  const welcome = useMemo<ChatMessage>(() => ({
    role: 'assistant',
    content: `👋 Hi! I'm your **Salesdig research assistant**.\n\nI can answer questions grounded in your saved company research, including technology, opportunities, decision makers, and recommendations.\n\nWhat would you like to know?`,
    createdAt: new Date().toISOString()
  }), []);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Drag state
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - 96,
    y: window.innerHeight - (window.innerWidth <= 640 ? 210 : 120),
  }));
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldScrollRef = useRef(false);

  // Drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    didDrag.current = false;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      didDrag.current = true;
      setPos({
        x: Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - 80),
        y: Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - 80)
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (hasHistory) return;
    setLoadingHistory(true);
    getChatHistory()
      .then(r => {
        const msgs = r.data.messages;
        setMessages(msgs.length > 0 ? msgs : [welcome]);
        setHasHistory(true);
      })
      .catch(() => setMessages([welcome]))
      .finally(() => setLoadingHistory(false));
  }, [open, hasHistory, welcome]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      shouldScrollRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    shouldScrollRef.current = true;
    setMessages(prev => [...prev, { role: 'user', content: msg, createdAt: new Date().toISOString() }]);
    setLoading(true);
    try {
      const res = await sendMessage(msg);
      const { reply, usedReports } = res.data;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
        usedReportIds: usedReports.map((r: ChatUsedReport) => r.id)
      }]);
    } catch (err: any) {
      console.error('[chat]', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await clearChatHistory().catch(() => {});
    setMessages([welcome]);
    setShowClearConfirm(false);
  };

  const handleFabClick = () => {
    if (didDrag.current) return; // don't toggle if user was dragging
    setOpen(o => !o);
  };

  const showSuggestions = messages.length === 1 && messages[0].role === 'assistant';

  // Panel position: open above/left of FAB
  const panelWidth = Math.min(380, window.innerWidth - 24);
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(12, Math.min(pos.x, window.innerWidth - panelWidth - 12)),
    top: Math.max(10, pos.y - 600),
    zIndex: 50,
    width: panelWidth,
    maxHeight: 'min(580px, calc(100vh - 120px))',
  };

  return (
    <>
      {/* Draggable FAB */}
      <div
        onMouseDown={onMouseDown}
        onClick={handleFabClick}
        className="fixed z-50 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105"
        style={{ left: pos.x, top: pos.y }}
      >
        {open ? (
          <div className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center border-2 border-white"
            style={{ background: 'linear-gradient(135deg, #0f766e, #0891b2)' }}>
            <X className="w-5 h-5 text-white" />
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full shadow-xl flex items-center justify-center bg-white border-2 border-teal-100">
              <BrandMark className="h-12 w-12" />
            </div>
            <span className="text-[11px] font-bold text-teal-800 bg-white px-2 py-0.5 rounded-full shadow border border-teal-100 whitespace-nowrap">
              Ask Salesdig
            </span>
          </>
        )}
      </div>

      {/* Panel */}
      {open && (
        <div
          className="flex flex-col rounded-2xl shadow-2xl border border-slate-200/80 bg-white overflow-hidden"
          style={panelStyle}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #0891b2 100%)` }}
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <BrandMark className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">Salesdig Research Assistant</p>
              <p className="text-xs opacity-70 leading-tight">Ask me about your companies</p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition-colors flex-shrink-0"
            >
              Clear conversation
            </button>
          </div>

          {/* Clear confirm bar */}
          {showClearConfirm && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50 border-b border-rose-100 flex-shrink-0">
              <p className="text-xs text-rose-700 font-medium">Clear all messages?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowClearConfirm(false)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleClear} className="text-xs px-2.5 py-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600">Clear</button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 bg-slate-50/50">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #0f766e, #0891b2)' }}
                      >
                        <BrandMark className="w-5 h-5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'text-white rounded-br-sm shadow-sm'
                          : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                      }`}
                      style={m.role === 'user' ? { background: 'linear-gradient(135deg, #0f766e, #0891b2)' } : {}}
                    >
                      {m.role === 'user' ? m.content : (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            h3: ({ children }) => <p className="font-bold text-slate-900 mt-2 mb-1">{children}</p>,
                            h2: ({ children }) => <p className="font-bold text-slate-900 mt-2 mb-1">{children}</p>,
                            code: ({ children }) => <code className="bg-slate-100 px-1 rounded text-xs font-mono">{children}</code>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}

                {showSuggestions && (
                  <div className="flex flex-col gap-2 pt-1">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="text-left text-xs px-3 py-2 rounded-xl border border-[#c7c9f0] text-[#0f766e] bg-white hover:bg-[#eef0ff] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="flex gap-2 justify-start">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #0f766e, #0891b2)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100 bg-white flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about your companies..."
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0f766e] focus:bg-white transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0f766e, #0891b2)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
