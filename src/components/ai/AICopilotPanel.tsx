import React, { useState, useRef, useEffect } from 'react';
import { sendAIChatMessage } from '../../services/aiService';
import { Sparkles, Send, Bot, User, X, ChevronRight } from 'lucide-react';

interface AICopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContext: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPT_CHIPS = [
  'Interpret the active control chart and rule violations',
  'Is our process capable of meeting Cpk ≥ 1.33?',
  'What is the difference between Cp and Cpk?',
  'Recommend 3 actions to reduce process variation',
  'Explain Nelson Rule #4 vs Rule #5',
];

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  isOpen,
  onClose,
  currentContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI-SPC Quality Analyst. I can interpret control charts, diagnose Western Electric / Nelson test rule violations, calculate process capability (Cp/Cpk), and guide root-cause investigations. How can I assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendAIChatMessage(query, history, currentContext);
      const assistantMsg: Message = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an error analyzing your request. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              AI-SPC Copilot
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Statistical Process Control Assistant
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {QUICK_PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-xs hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-600"
            >
              <ChevronRight className="w-2.5 h-2.5 text-indigo-500" />
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl p-3 shadow-xs ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-100 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              <span
                className={`mt-1.5 block text-[10px] ${
                  m.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </span>
            </div>
            {m.role === 'user' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-500 dark:border-slate-800 dark:bg-slate-800/80">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.2s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px]">Evaluating process data...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about control limits, trends, capability..."
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
