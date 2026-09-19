import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  time: string;
  id: string;
}

interface SavedConversation {
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' } as Record<string, string>)[char] || char
  );
}

function formatMessage(text: string): string {
  return escapeHtml(text)
    .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function replyTo(text: string, previous?: string): string {
  const lower = text.toLowerCase().trim();
  const prev = previous?.toLowerCase() || '';
  const nameMatch = text.match(/(?:my name is|call me)\s+([a-z][a-z '-]{1,30})/i);

  if (nameMatch) return `Nice to meet you, **${nameMatch[1].trim()}**! I\u2019ll remember that for this conversation. What would you like to work on?`;
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|sup)\b/i.test(text)) return "Hey! It\u2019s good to hear from you. \u2728\n\nWe can talk about whatever is on your mind\u2014your day, ideas, entertainment, relationships, plans, or something completely random. What\u2019s up?";
  if (/\b(thanks|thank you|thx)\b/.test(lower)) return "You\u2019re welcome! I\u2019m happy to help\u2014or we can just keep chatting. What are you thinking about?";
  if (lower.includes('how are you')) return "I\u2019m doing well and glad you\u2019re here. How are you doing today?";
  if (/\b(i am|i'm|im|i feel)\s+(sad|depressed|lonely|upset|angry|stressed|anxious|tired|happy|excited|bored|confused)\b/i.test(text)) return "Thanks for telling me. That sounds like a real feeling, and you don\u2019t have to explain it perfectly.\n\nDo you want to:\n- Vent about what\u2019s going on\n- Figure out what caused it\n- Think of something that might help right now\n\nJust let me know which direction feels right.";
  if (/\b(lonely|no friends|friendless|feel alone)\b/.test(lower)) return "I\u2019m sorry you\u2019re feeling alone. I can keep you company and listen.\n\nIf you want, tell me what happened today, or we can talk about a hobby, show, game, or topic you enjoy. Sometimes just having someone to chat with makes a difference.";
  if (/\b(boyfriend|girlfriend|crush|dating|relationship|breakup|love|friend drama)\b/.test(lower)) return "Relationships can be complicated. I can listen without judging, help you sort out what you\u2019re feeling, or help draft a message. What happened?";
  if (/\b(bored|fun|entertain me|something to do|activity)\b/.test(lower)) return "Let\u2019s fix that! Here are some ideas:\n\n- Play **20 questions** or **would you rather**\n- Make up a story together\n- Brainstorm a weird invention\n- Do a trivia quiz\n- Plan a meal or trip\n- Talk about movies, music, or games\n\nPick a direction\u2014or say \u201csurprise me.\u201d";
  if (/\b(joke|make me laugh|funny)\b/.test(lower)) return "Why did the computer go to the doctor?\n\nBecause it had a virus! 😄\n\nI\u2019ll be here all week\u2014try the assistant!";
  if (/\b(movie|film|tv|television|show|series|anime|book|music|song|game|gaming)\b/.test(lower)) return "I\u2019d love to talk about that! Tell me what you\u2019re watching, reading, listening to, or playing.\n\nI can discuss:\n- Themes and symbolism\n- Character development\n- Recommendations based on your taste\n- Hot takes and debates\n\nWhat\u2019s on your mind?";
  if (/\b(opinion|think about|thoughts on|favorite|recommend)\b/.test(lower)) return "I can give you a thoughtful take, compare different perspectives, or help you decide. Tell me the topic and what matters most to you.";
  if (/\b(my day|today|this morning|this week|weekend|plans|plan my day)\b/.test(lower)) return "Tell me what your day looks like and what you want to get done. I can help:\n\n- **Prioritize** your tasks\n- Make a **realistic plan**\n- Talk through how things are going\n\nWhat\u2019s on your plate?";
  if (/\b(what are you|who are you|your name)\b/.test(lower)) return "I\u2019m **Claude**, a conversational AI assistant by Anthropic.\n\nI can answer questions, brainstorm, write, explain, plan, and keep you company. I don\u2019t have a personal life, but I\u2019m always happy to hear about yours.";
  if (/\b(tell me about yourself|talk to me|keep me company|chat with me)\b/.test(lower)) return "Sure\u2014I\u2019m here. We can have a relaxed conversation about your day, interests, ideas, goals, or anything random.\n\nTo start: what\u2019s something you\u2019ve been enjoying lately?";
  if (/\b(i like|i love|my favorite|i enjoy)\b/.test(lower)) return "That sounds interesting! What do you like most about it, and how did you get into it?";
  if (/\b(tell me a story|story)\b/.test(lower)) return "Here\u2019s a tiny one:\n\n---\n\nA person found a door in their wall that had never been there before. They opened it and discovered a room filled with every idea they had been too nervous to try.\n\nThe first thing they picked up was a key.\n\n---\n\n*What do you think the key opened?*";
  if (/\b(20 questions|twenty questions|would you rather|quiz me|surprise me)\b/.test(lower)) return "Absolutely! Here\u2019s one:\n\n**Would you rather** be able to speak every language fluently, or play every musical instrument perfectly?\n\nWhy? I\u2019m curious what you\u2019d pick.";

  const math = text.match(/^(?:what is|calculate|solve)\s+([0-9+\-*/().%\s]+)\??$/i);
  if (math) {
    try {
      const expression = math[1].replace(/%/g, '/100');
      if (/^[0-9+\-*/().\s/]+$/.test(expression)) {
        const answer = Function(`"use strict"; return (${expression})`)();
        if (Number.isFinite(answer)) return `The answer is **${answer}**.\n\n\`\`\`\n${math[1].trim()} = ${answer}\n\`\`\``;
      }
    } catch { /* Fall through */ }
  }

  if (/\b(math|algebra|equation|geometry|calculus|fraction|percentage|probability|integral|derivative)\b/.test(lower)) {
    return "I can help with that math problem step by step.\n\n**Here\u2019s my approach:**\n1. Identify what is known\n2. Figure out what you need to find\n3. Choose the right rule or formula\n4. Work through it carefully\n\nPaste the exact problem and I\u2019ll show the work.";
  }
  if (/\b(physics|force|motion|gravity|energy|newton|velocity|acceleration)\b/.test(lower)) {
    return "For physics, let\u2019s work through it systematically:\n\n1. **List** the known values\n2. **Choose** a consistent unit system\n3. **Write** the relevant law\n4. **Substitute** carefully\n5. **Check** whether the units make sense\n\nSend the full question and I\u2019ll walk through each step.";
  }
  if (/\b(chemistry|chemical|atom|molecule|reaction|periodic table|acid|base|ph)\b/.test(lower)) {
    return "I can explain chemistry clearly using particles, equations, and examples.\n\nFor a reaction question:\n- Identify the **reactants** and **products**\n- **Balance** atoms on each side\n- **Check** charge conservation\n\nWhat exact concept or problem are you studying?";
  }
  if (/\b(biology|cell|dna|gene|mitosis|ecosystem|photosynthesis|evolution|organism)\b/.test(lower)) {
    return "A useful way to study biology is to connect **structure to function**:\n\n- What is it made of?\n- How does it work?\n- Why does it matter?\n\nI can help with cells, genetics, evolution, ecology, or anatomy\u2014send the question or topic.";
  }
  if (/\b(history|historical|world war|revolution|empire|ancient|civil war|government|civics)\b/.test(lower)) {
    return "For history, we can organize the answer as:\n\n1. **Causes** \u2014 what led to it\n2. **Key events** \u2014 the timeline\n3. **Perspectives** \u2014 different viewpoints\n4. **Consequences** \u2014 the aftermath\n\nTell me the time period or event, and I\u2019ll explain it clearly.";
  }
  if (/\b(english|grammar|essay|literature|poem|novel|thesis|argument|paragraph)\b/.test(lower)) {
    return "I can help with grammar, reading analysis, essays, and creative writing.\n\nA strong response usually has:\n- A clear **claim**\n- Supporting **evidence**\n- Your **explanation**\n- A link back to the question\n\nPaste your draft or assignment and tell me the required length and level.";
  }
  if (/\b(computer science|coding|javascript|python|html|css|programming|algorithm|code)\b/.test(lower)) {
    return "I can help debug code, explain programming concepts, or design an algorithm.\n\nShare:\n- The **code** you have\n- The **expected result**\n- What **actually happens**\n\nI\u2019ll explain the fix so you can understand it, not just copy it.";
  }
  if (/\b(weather|forecast|temperature)\b/.test(lower)) return "I can\u2019t access live weather data in this demo. But tell me the city and date, and I can help you interpret a forecast you paste here or plan what to pack.";
  if (/\b(recipe|cook|cooking|dinner|lunch|breakfast)\b/.test(lower)) return "I can help with that! Tell me:\n\n- Your **ingredients**\n- **Dietary needs**\n- Available **time**\n- How many **people** you\u2019re serving\n\nAnd I\u2019ll suggest a practical recipe.";
  if (/\b(travel|trip|vacation|hotel|flight|itinerary)\b/.test(lower)) return "I can help plan a trip! Share:\n\n- **Destination**\n- **Dates**\n- **Budget**\n- **Interests**\n- Preferred **pace** (relaxed vs packed)\n\nAnd I\u2019ll build you an itinerary.";
  if (/\b(health|symptom|medicine|medical|pain|sick)\b/.test(lower)) return "I can provide general health information, but I can\u2019t diagnose you.\n\n\u26a0\ufe0f For severe, sudden, or life-threatening symptoms, contact emergency services.\n\nOtherwise, share the symptoms, duration, age group, and relevant context and I\u2019ll do my best to help.";
  if (/\b(translate|translation)\b/.test(lower)) return "Sure\u2014send the text and tell me the target language. I can provide a literal translation or a more natural version and explain any important nuance.";
  if (/\b(compare|difference between|pros and cons|versus|vs\.?)\b/.test(lower)) return "I can compare them clearly. Name the options and tell me what matters most\u2014price, speed, quality, simplicity, privacy, or another priority\u2014and I\u2019ll make a concise decision table.";
  if (/\b(explain|what does|what is|how does|why does|teach me)\b/.test(lower)) {
    return `Absolutely. I\u2019ll explain it simply first, then add detail and an example.\n\nFor **"${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"**, what level should I aim for?\n\n- Elementary\n- Middle school\n- High school\n- College`;
  }
  if (/\b(write|rewrite|draft|summarize|summary|proofread|paraphrase)\b/.test(lower)) return "I can help write, revise, summarize, or proofread that.\n\nSend me:\n- The **text** or assignment\n- The **audience**\n- Desired **tone**\n- Required **length**\n- Any specific **rules**";
  if (lower.includes('brainstorm')) return "Absolutely! I can help generate ideas, compare them, and turn the best one into a plan.\n\nTell me:\n- What **subject** is the project for?\n- What **requirements** do you have?\n- What\u2019s the **deadline**?\n\nLet\u2019s get creative! 💡";
  if (lower.includes('?') || prev) return `Good question. I can work through it with you, but I don\u2019t want to guess at missing details.\n\nShare:\n- The **exact wording**\n- Any **answer choices** or numbers\n- What you\u2019ve **tried so far**\n\nI\u2019ll explain the reasoning step by step.`;
  return `Absolutely \u2014 I can help you think that through.\n\nTell me a little more about what you need, and I\u2019ll give you a clear answer with examples or step-by-step reasoning when it helps.`;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('fex-dark-mode') === 'true');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem('fex-model') || 'claude-sonnet');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fex-conversations') || '[]');
    } catch { return []; }
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [toast, setToast] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();
  const streamInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('fex-dark-mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('fex-conversations', JSON.stringify(savedConversations));
  }, [savedConversations]);

  useEffect(() => {
    localStorage.setItem('fex-model', model);
  }, [model]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isTyping, streamingText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        resetChat();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(''), 2200);
  }, []);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      showToast('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, [showToast]);

  const streamResponse = useCallback((fullText: string, newMessages: ChatMessage[], newIndex: number) => {
    setIsTyping(true);
    setStreamingText('');
    let currentIndex = 0;
    const charsPerTick = Math.max(2, Math.floor(fullText.length / 60));

    streamInterval.current = setInterval(() => {
      currentIndex += charsPerTick;
      if (currentIndex >= fullText.length) {
        currentIndex = fullText.length;
        clearInterval(streamInterval.current);

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          text: fullText,
          time: formatTime(),
          id: generateId()
        };
        const updatedMessages = [...newMessages, assistantMsg];
        setMessages(updatedMessages);
        setIsTyping(false);
        setStreamingText('');

        setSavedConversations(prev => {
          const copy = [...prev];
          if (newIndex >= 0 && copy[newIndex]) {
            copy[newIndex] = { ...copy[newIndex], messages: updatedMessages };
          }
          return copy;
        });
      } else {
        setStreamingText(fullText.slice(0, currentIndex));
      }
    }, 25);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || isTyping) return;

    const time = formatTime();
    const userMsg: ChatMessage = { role: 'user', text, time, id: generateId() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setPrompt('');
    setAttachments([]);

    let newIndex = activeIndex;
    let newConversations = [...savedConversations];

    if (activeIndex < 0) {
      newIndex = savedConversations.length;
      const title = text.split('\n')[0].slice(0, 40) || 'New chat';
      newConversations.push({ title, messages: [...newMessages], createdAt: Date.now() });
    } else {
      newConversations[activeIndex] = { ...newConversations[activeIndex], messages: [...newMessages] };
    }

    setActiveIndex(newIndex);
    setSavedConversations(newConversations);

    const response = replyTo(text, messages.length >= 2 ? messages[messages.length - 2].text : undefined);
    const delay = Math.min(800, Math.max(300, response.length * 3));

    setTimeout(() => {
      streamResponse(response, newMessages, newIndex);
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const resetChat = () => {
    if (streamInterval.current) clearInterval(streamInterval.current);
    setActiveIndex(-1);
    setMessages([]);
    setAttachments([]);
    setPrompt('');
    setSidebarOpen(false);
    setStreamingText('');
    setIsTyping(false);
  };

  const loadConversation = (index: number) => {
    if (streamInterval.current) clearInterval(streamInterval.current);
    const item = savedConversations[index];
    if (!item) return;
    setActiveIndex(index);
    setMessages(item.messages || []);
    setSidebarOpen(false);
    setStreamingText('');
    setIsTyping(false);
  };

  const clearChat = () => {
    if (activeIndex >= 0) {
      setSavedConversations(prev => prev.filter((_, i) => i !== activeIndex));
    }
    resetChat();
    showToast('Chat cleared');
  };

  const exportChat = () => {
    if (messages.length === 0) {
      showToast('No messages to export');
      return;
    }
    const content = messages.map(m => `[${m.time}] ${m.role === 'user' ? 'You' : 'Claude'}: ${m.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Chat exported');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const filteredConversations = savedConversations
    .map((c, i) => ({ ...c, originalIndex: i }))
    .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const hoverBg = darkMode ? '#292825' : '#e5e2db';
  const activeBg = darkMode ? '#302e2a' : '#e2dfd8';

  return (
    <div className="min-h-screen no-theme-transition" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen flex flex-col z-30 transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{ width: 280, padding: '20px 14px 14px', background: 'var(--sidebar)', borderRight: '1px solid var(--line)' }}
        aria-label="Conversation navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 pb-5">
          <span className="float-anim" style={{ color: 'var(--accent)', fontSize: 24 }}>✦</span>
          <span className="text-xl font-semibold tracking-tight">Claude</span>
        </div>

        {/* New Chat */}
        <button
          onClick={() => { resetChat(); }}
          className="flex items-center gap-2.5 w-full px-3.5 py-3 rounded-xl text-left font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{ border: '1px solid var(--line)', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="text-lg">＋</span> New chat
          <span className="ml-auto text-xs opacity-50 hidden md:inline">⌘K</span>
        </button>

        {/* Search */}
        {showSearch && (
          <div className="mt-3 fade-in">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-3 py-2 rounded-lg text-sm border-0 outline-none"
              style={{ background: darkMode ? '#1e1e1c' : '#e5e2db', color: 'var(--text)' }}
              autoFocus
            />
          </div>
        )}

        {/* Conversation List */}
        <nav className="flex-1 overflow-y-auto pt-4 conversation-list" aria-label="Conversations">
          {filteredConversations.length === 0 && searchQuery && (
            <p className="text-center text-xs py-4" style={{ color: 'var(--muted)' }}>No matches found</p>
          )}
          {filteredConversations.map((conv) => (
            <button
              key={conv.originalIndex}
              onClick={() => loadConversation(conv.originalIndex)}
              className={`group flex items-center w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition-all duration-150 ${
                conv.originalIndex === activeIndex ? 'font-medium' : ''
              }`}
              style={{
                background: conv.originalIndex === activeIndex ? activeBg : 'transparent',
                color: conv.originalIndex === activeIndex ? 'var(--text)' : '#585650',
              }}
              onMouseEnter={e => {
                if (conv.originalIndex !== activeIndex) e.currentTarget.style.background = hoverBg;
              }}
              onMouseLeave={e => {
                if (conv.originalIndex !== activeIndex) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span className="truncate flex-1">{conv.title}</span>
              <span
                className="ml-2 opacity-0 group-hover:opacity-60 text-xs cursor-pointer flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSavedConversations(prev => prev.filter((_, i) => i !== conv.originalIndex));
                  if (conv.originalIndex === activeIndex) resetChat();
                  showToast('Conversation deleted');
                }}
              >
                ×
              </span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="grid gap-1 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors"
            style={{ background: 'transparent', color: '#5d5a54' }}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            🔍 <span>Search chats</span>
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors"
            style={{ background: 'transparent', color: '#5d5a54' }}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {darkMode ? '☀️' : '☾'} <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button
            onClick={() => showToast('Account settings coming soon')}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors"
            style={{ background: 'transparent', color: '#5d5a54' }}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="grid place-items-center w-7 h-7 rounded-full text-white text-xs font-medium" style={{ background: 'linear-gradient(135deg, #d97757, #e8a87c)' }}>Y</span>
            <span>Your account</span>
            <span className="ml-auto tracking-widest text-xs opacity-50">•••</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-screen md:ml-[280px]">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 glass sticky top-0 z-10" style={{ background: darkMode ? 'rgba(26,26,25,0.85)' : 'rgba(247,246,242,0.85)' }}>
          <button
            className="md:hidden bg-transparent text-xl p-1"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <label className="flex items-center gap-2 mx-auto cursor-pointer group">
            <span className="relative w-2 h-2 rounded-full status-pulse" style={{ background: '#61a878' }}></span>
            <select
              value={model}
              onChange={e => {
                setModel(e.target.value);
                const opt = e.target.options[e.target.selectedIndex];
                showToast(`${opt.text} selected`);
              }}
              className="appearance-none border-0 outline-0 px-1 py-1 bg-transparent cursor-pointer font-semibold text-sm group-hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text)' }}
              aria-label="Choose Claude model"
            >
              <option value="claude-sonnet" style={{ background: 'var(--panel)', color: 'var(--text)' }}>Claude Sonnet</option>
              <option value="claude-opus" style={{ background: 'var(--panel)', color: 'var(--text)' }}>Claude Opus</option>
              <option value="claude-haiku" style={{ background: 'var(--panel)', color: 'var(--text)' }}>Claude Haiku</option>
            </select>
            <span className="pointer-events-none -ml-1 text-base" style={{ color: 'var(--muted)' }}>⌄</span>
          </label>

          <div className="flex items-center gap-1">
            <button
              onClick={exportChat}
              className="p-2 rounded-lg text-xs transition-colors"
              style={{ background: 'transparent', color: 'var(--muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = darkMode ? '#292825' : '#eae8e1'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
              title="Export chat"
            >
              ↗
            </button>
            <button
              onClick={clearChat}
              className="px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{ background: 'transparent', color: 'var(--muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = darkMode ? '#292825' : '#eae8e1'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              Clear
            </button>
          </div>
        </header>

        {/* Chat Shell */}
        <section className="flex flex-col mx-auto px-4 md:px-6 pb-4" style={{ minHeight: 'calc(100vh - 56px)', maxWidth: 820, paddingTop: '5vh' }}>
          <div className="flex-1" aria-live="polite">
            {/* Empty State */}
            {messages.length === 0 && !isTyping && !streamingText && (
              <div className="text-center mx-auto fade-in" style={{ padding: '8vh 0 4vh' }}>
                <div className="relative inline-block mb-6">
                  <div className="text-5xl gradient-text float-anim">✦</div>
                  <div className="absolute inset-0 text-5xl opacity-20 blur-sm" style={{ color: 'var(--accent)' }}>✦</div>
                </div>
                <h1 className="m-0 tracking-tight mb-2" style={{ font: "500 clamp(28px, 4vw, 40px)/1.15 'Newsreader', Georgia, serif" }}>
                  How can I help you today?
                </h1>
                <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Ask me anything, or try one of these ideas.</p>
                <div className="flex justify-center flex-wrap gap-2.5 max-w-lg mx-auto">
                  {[
                    { label: '💡 Brainstorm ideas', prompt: 'Help me brainstorm ideas for a project' },
                    { label: '🧠 Explain a complex topic', prompt: 'Explain quantum computing simply' },
                    { label: '✍️ Help me write', prompt: 'Help me write an email' },
                    { label: '📝 Summarize something', prompt: 'Summarize a long article for me' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { setPrompt(item.prompt); textareaRef.current?.focus(); }}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ border: '1px solid var(--line)', background: 'var(--panel)', color: '#625f59', boxShadow: 'var(--shadow)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = '#625f59'; }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-8 opacity-50">⌘K for new chat · ⌘/ to focus input</p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={msg.id || i}
                className={`message-row flex gap-3 max-w-[720px] mx-auto my-5 leading-relaxed ${msg.role === 'user' ? 'justify-end msg-animate-right' : 'msg-animate-left'}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-full text-white text-sm shadow-sm" style={{ background: 'linear-gradient(135deg, var(--accent), #e8a87c)' }}>
                    ✦
                  </div>
                )}
                <div className={`relative ${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[90%]'}`}>
                  {msg.role === 'user' ? (
                    <div className="px-4 py-3 text-sm" style={{ background: darkMode ? '#34312c' : '#e8e3da', borderRadius: '18px 18px 4px 18px' }}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      <div className="text-[10px] mt-1.5 opacity-60" style={{ color: 'var(--muted)' }}>{msg.time}</div>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] opacity-60" style={{ color: 'var(--muted)' }}>Claude \u00b7 {msg.time}</span>
                        <div className="msg-actions flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="p-1 rounded text-xs transition-colors"
                            style={{ color: 'var(--muted)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                            title="Copy message"
                          >
                            {copiedId === msg.id ? '✓' : '⎙'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streamingText && (
              <div className="message-row flex gap-3 max-w-[720px] mx-auto my-5 leading-relaxed msg-animate-left">
                <div className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-full text-white text-sm shadow-sm" style={{ background: 'linear-gradient(135deg, var(--accent), #e8a87c)' }}>
                  ✦
                </div>
                <div className="max-w-[90%]">
                  <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: formatMessage(streamingText) }} />
                  <span className="streaming-cursor"></span>
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {isTyping && !streamingText && (
              <div className="flex gap-3 max-w-[720px] mx-auto my-5 msg-animate-left">
                <div className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-full text-white text-sm shadow-sm" style={{ background: 'linear-gradient(135deg, var(--accent), #e8a87c)' }}>
                  ✦
                </div>
                <div className="flex items-center gap-1.5 min-w-[52px] px-4 py-3 rounded-2xl" style={{ background: darkMode ? '#2a2926' : '#f0ede6' }}>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form onSubmit={handleSubmit} className="sticky bottom-0 pt-4 no-theme-transition" style={{ background: `linear-gradient(transparent, var(--bg) 30%)` }}>
            <div
              className="rounded-2xl px-4 pt-3.5 pb-2.5 transition-shadow duration-200"
              style={{ border: '1px solid var(--line)', background: 'var(--panel)', boxShadow: 'var(--shadow)' }}
            >
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Message Claude..."
                className="block w-full min-h-7 max-h-50 resize-none border-0 outline-0 bg-transparent leading-normal text-sm placeholder:opacity-50"
                style={{ color: 'var(--text)' }}
                aria-label="Write your prompt"
              />

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {attachments.map((file, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium fade-in"
                      style={{ background: darkMode ? '#2d2c2a' : '#f0ede6', color: 'var(--muted)' }}
                    >
                      📎 {file.name}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="bg-transparent text-sm leading-none p-0 ml-1 hover:opacity-70"
                        style={{ color: '#8d8880' }}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  multiple
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full text-lg transition-all duration-200 hover:scale-110 active:scale-90"
                  style={{ background: 'transparent', color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = darkMode ? '#292825' : '#f0ede6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  aria-label="Attach a file"
                >
                  📎
                </button>
                <span className="flex-1 text-center text-[10px] hidden md:block" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                  Claude can make mistakes. Check important info.
                </span>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isTyping}
                  className="w-9 h-9 rounded-xl text-white text-lg leading-none transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 cursor-pointer"
                  style={{ background: prompt.trim() ? 'var(--accent)' : 'var(--text)' }}
                  aria-label="Send message"
                >
                  ↑
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      {/* Toast */}
      <div
        className={`fixed left-1/2 bottom-6 z-50 px-4 py-2.5 rounded-xl text-xs font-medium text-white pointer-events-none transition-all duration-300 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{
          transform: `translateX(-50%) ${toast ? 'translateY(0)' : 'translateY(16px)'}`,
          background: darkMode ? '#3a3935' : '#2d2b28',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}
        role="status"
      >
        {toast}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden fade-in"
          onClick={() => setSidebarOpen(false)}
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        />
      )}
    </div>
  );
}
