import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Check, CheckCheck } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { cn } from '../lib/utils';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [myRole, setMyRole] = useState<'Caja' | 'Cocina'>('Caja'); // Default to Caja
  const [popupMessage, setPopupMessage] = useState<any | null>(null);
  const { messages, sendMessage, markAsRead } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Trigger popup when receiving a new message and chat is closed
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderRole !== myRole && lastMessage.status === 'sent' && !isOpen) {
        setPopupMessage(lastMessage);
        
        // Hide after 5 seconds
        const timer = setTimeout(() => {
          setPopupMessage(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, isOpen, myRole]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Mark as read all unread messages not from me
      messages.forEach(msg => {
        if (msg.senderRole !== myRole && msg.status === 'sent') {
          markAsRead(msg.id);
        }
      });
    }
  }, [messages, isOpen, myRole]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    await sendMessage({
      text,
      senderRole: myRole,
      senderName: myRole === 'Caja' ? 'Cajero Principal' : 'Jefe de Cocina',
      senderId: myRole === 'Caja' ? 1 : 2
    });
    
    setText('');
  };

  // Count unread messages (messages sent to me that are not 'read')
  const unreadCount = messages.filter(m => m.senderRole !== myRole && m.status === 'sent').length;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* Toast Notification Popup */}
      {popupMessage && !isOpen && (
        <div 
          onClick={() => {
             setIsOpen(true);
             setPopupMessage(null);
          }}
          className="absolute bottom-20 right-0 w-72 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl cursor-pointer hover:bg-slate-800 transition-colors animate-in slide-in-from-right-10 fade-in duration-300 border border-slate-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Nuevo mensaje de {popupMessage.senderRole}</p>
              <p className="text-sm font-medium truncate text-slate-200">{popupMessage.text}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setPopupMessage(null);
              }}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all relative group border-4 border-white"
        >
          <MessageSquare className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
              {unreadCount}
            </span>
          )}
          
          {/* Tooltip */}
          <div className="absolute right-16 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
            Chat Interno
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-slate-800" />
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-[350px] h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Chat Interno</h3>
                <div className="flex gap-2 text-[10px] text-slate-300">
                  <button 
                    onClick={() => setMyRole('Caja')}
                    className={cn("px-2 py-0.5 rounded", myRole === 'Caja' ? "bg-white/20 text-white font-bold" : "hover:bg-white/10")}
                  >
                    Soy Caja
                  </button>
                  <button 
                    onClick={() => setMyRole('Cocina')}
                    className={cn("px-2 py-0.5 rounded", myRole === 'Cocina' ? "bg-white/20 text-white font-bold" : "hover:bg-white/10")}
                  >
                    Soy Cocina
                  </button>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 bg-slate-50 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="m-auto text-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">Inicia la conversación</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderRole === myRole;
                return (
                  <div key={msg.id || idx} className={cn("flex flex-col max-w-[85%]", isMe ? "self-end items-end" : "self-start items-start")}>
                    
                    {!isMe && <span className="text-[10px] font-bold text-slate-400 ml-1 mb-0.5 uppercase tracking-wider">{msg.senderRole}</span>}
                    
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm relative group",
                      isMe 
                        ? "bg-indigo-600 text-white rounded-tr-sm" 
                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-sm"
                    )}>
                      {msg.text}
                      
                      {/* Timestamp tooltip */}
                      <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",
                        isMe ? "right-full mr-2" : "left-full ml-2"
                      )}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    {isMe && (
                      <div className="flex items-center gap-1 mt-1 mr-1">
                        <span className="text-[9px] text-slate-400 font-medium">
                           {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3 h-3 text-sky-500" />
                        ) : (
                          <Check className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm outline-none focus:border-indigo-500 transition-colors"
            />
            <button 
              type="submit"
              disabled={!text.trim()}
              className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
