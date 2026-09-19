import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

interface SavedConversation {
  title: string;
  messages: ChatMessage[];
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' } as Record<string, string>)[char] || char
  );
}

function formatMessage(text: string): string {
  return escapeHtml(text)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function replyTo(text: string, previous?: string): string {
  const lower = text.toLowerCase().trim();
  const prev = previous?.toLowerCase() || '';
  const nameMatch = text.match(/(?:my name is|call me)\s+([a-z][a-z '-]{1,30})/i);

  if (nameMatch) return `Nice to meet you, ${nameMatch[1].trim()}! I\u2019ll remember that for this conversation. What would you like to work on?`;
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|sup)\b/i.test(text)) return "Hey! It\u2019s good to hear from you. We can talk about whatever is on your mind\u2014your day, ideas, entertainment, relationships, plans, or something completely random. What\u2019s up?";
  if (/\b(thanks|thank you|thx)\b/.test(lower)) return "You\u2019re welcome! I\u2019m happy to help\u2014or we can just keep chatting. What are you thinking about?";
  if (lower.includes('how are you')) return "I\u2019m doing well and glad you\u2019re here. How are you doing today?";
  if (/\b(i am|i'm|im|i feel)\s+(sad|depressed|lonely|upset|angry|stressed|anxious|tired|happy|excited|bored|confused)\b/i.test(text)) return "Thanks for telling me. That sounds like a real feeling, and you don\u2019t have to explain it perfectly. Do you want to vent, figure out what caused it, or think of something that might help right now?";
  if (/\b(lonely|no friends|friendless|feel alone)\b/.test(lower)) return "I\u2019m sorry you\u2019re feeling alone. I can keep you company and listen. If you want, tell me what happened today, or we can talk about a hobby, show, game, or topic you enjoy.";
  if (/\b(boyfriend|girlfriend|crush|dating|relationship|breakup|love|friend drama)\b/.test(lower)) return "Relationships can be complicated. I can listen without judging, help you sort out what you\u2019re feeling, or help draft a message. What happened?";
  if (/\b(bored|fun|entertain me|something to do|activity)\b/.test(lower)) return "Let\u2019s fix that. We could play 20 questions, make up a story, brainstorm a weird invention, do a quiz, plan a meal, talk about movies or music, or come up with something fun to do. Pick a direction\u2014or say \u201csurprise me.\u201d";
  if (/\b(joke|make me laugh|funny)\b/.test(lower)) return "Why did the computer go to the doctor? Because it had a virus. I\u2019ll be here all week\u2014try the assistant!";
  if (/\b(movie|film|tv|television|show|series|anime|book|music|song|game|gaming)\b/.test(lower)) return "I\u2019d love to talk about that. Tell me what you\u2019re watching, reading, listening to, or playing, and I can discuss themes, characters, recommendations, or hot takes. I may not know the latest releases, but I can still chat about what you share.";
  if (/\b(opinion|think about|thoughts on|favorite|recommend)\b/.test(lower)) return "I can give you a thoughtful take, compare different perspectives, or help you decide. Tell me the topic and what matters most to you.";
  if (/\b(my day|today|this morning|this week|weekend|plans|plan my day)\b/.test(lower)) return "Tell me what your day looks like and what you want to get done. I can help prioritize it, make a realistic plan, or just talk through how it\u2019s going.";
  if (/\b(what are you|who are you|your name)\b/.test(lower)) return "I\u2019m Claude, a conversational AI assistant. I can answer questions, brainstorm, write, explain, plan, and keep you company. I don\u2019t have a personal life, but I\u2019m always happy to hear about yours.";
  if (/\b(tell me about yourself|talk to me|keep me company|chat with me)\b/.test(lower)) return "Sure\u2014I\u2019m here. We can have a relaxed conversation about your day, interests, ideas, goals, or anything random. To start: what\u2019s something you\u2019ve been enjoying lately?";
  if (/\b(i like|i love|my favorite|i enjoy)\b/.test(lower)) return "That sounds interesting! What do you like most about it, and how did you get into it?";
  if (/\b(tell me a story|story)\b/.test(lower)) return "Here\u2019s a tiny one: A person found a door in their wall that had never been there before. They opened it and discovered a room filled with every idea they had been too nervous to try. The first thing they picked up was a key.";
  if (/\b(20 questions|twenty questions|would you rather|quiz me|surprise me)\b/.test(lower)) return "Absolutely. Here\u2019s one: would you rather be able to speak every language or play every musical instrument perfectly? Why?";

  const math = text.match(/^(?:what is|calculate|solve)\s+([0-9+\-*/().%\s]+)\??$/i);
  if (math) {
    try {
      const expression = math[1].replace(/%/g, '/100');
      if (/^[0-9+\-*/().\s/]+$/.test(expression)) {
        const answer = Function(`"use strict"; return (${expression})`)();
        if (Number.isFinite(answer)) return `The answer is ${answer}.\n\nI evaluated: ${math[1].trim()}`;
      }
    } catch { /* Fall through */ }
  }

  if (/\b(math|algebra|equation|geometry|calculus|fraction|percentage|probability|integral|derivative)\b/.test(lower)) {
    return "I can help with that math problem step by step. Start by identifying what is known, what you need to find, and which rule or formula connects them. Paste the exact problem and I\u2019ll show the work instead of only giving the answer.";
  }
  if (/\b(physics|force|motion|gravity|energy|newton|velocity|acceleration)\b/.test(lower)) {
    return "For physics, let\u2019s list the known values, choose a consistent unit system, write the relevant law, substitute carefully, and check whether the units make sense. Send the full question and I\u2019ll walk through each step.";
  }
  if (/\b(chemistry|chemical|atom|molecule|reaction|periodic table|acid|base|ph)\b/.test(lower)) {
    return "I can explain chemistry clearly using particles, equations, and examples. For a reaction question, identify the reactants and products first, then balance atoms and check charge. What exact concept or problem are you studying?";
  }
  if (/\b(biology|cell|dna|gene|mitosis|ecosystem|photosynthesis|evolution|organism)\b/.test(lower)) {
    return "A useful way to study biology is to connect structure to function: what is it made of, how does it work, and why does it matter? I can help with cells, genetics, evolution, ecology, or anatomy\u2014send the question or topic.";
  }
  if (/\b(history|historical|world war|revolution|empire|ancient|civil war|government|civics)\b/.test(lower)) {
    return "For history, we can organize the answer as causes, key events, perspectives, and consequences. Tell me the time period or event, and I\u2019ll explain it in a clear timeline while separating established facts from interpretation.";
  }
  if (/\b(english|grammar|essay|literature|poem|novel|thesis|argument|paragraph)\b/.test(lower)) {
    return "I can help with grammar, reading analysis, essays, and creative writing. A strong school response usually has a clear claim, evidence, explanation, and a link back to the question. Paste your draft or assignment and tell me the required length and level.";
  }
  if (/\b(computer science|coding|javascript|python|html|css|programming|algorithm|code)\b/.test(lower)) {
    return "I can help debug code, explain programming concepts, or design an algorithm. Share the code, the expected result, and what actually happens. I\u2019ll explain the fix so you can understand it, not just copy it.";
  }
  if (/\b(weather|forecast|temperature)\b/.test(lower)) return "I can\u2019t access live weather data in this offline assistant. Tell me the city and date, and I can help you interpret a forecast you paste here or plan what to pack.";
  if (/\b(recipe|cook|cooking|dinner|lunch|breakfast)\b/.test(lower)) return "I can help with that. Tell me your ingredients, dietary needs, available time, and how many people you\u2019re serving, and I\u2019ll suggest a practical recipe.";
  if (/\b(travel|trip|vacation|hotel|flight|itinerary)\b/.test(lower)) return "I can help plan a trip, but I can\u2019t check live prices or availability. Share your destination, dates, budget, interests, and pace, and I\u2019ll build an itinerary.";
  if (/\b(health|symptom|medicine|medical|pain|sick)\b/.test(lower)) return "I can provide general health information, but I can\u2019t diagnose you. For severe, sudden, or life-threatening symptoms, contact emergency services; otherwise share the symptoms, duration, age group, and relevant context.";
  if (/\b(translate|translation)\b/.test(lower)) return "Sure\u2014send the text and tell me the target language. I can provide a literal translation or a more natural version and explain any important nuance.";
  if (/\b(compare|difference between|pros and cons|versus|vs\.?)\b/.test(lower)) return "I can compare them clearly. Name the options and tell me what matters most\u2014price, speed, quality, simplicity, privacy, or another priority\u2014and I\u2019ll make a concise decision table.";
  if (/\b(explain|what does|what is|how does|why does|teach me)\b/.test(lower)) {
    return `Absolutely. I\u2019ll explain it simply first, then add detail and an example. For "${text}", what level should I aim for\u2014elementary, middle school, high school, or college?`;
  }
  if (/\b(write|rewrite|draft|summarize|summary|proofread|paraphrase)\b/.test(lower)) return "I can help write, revise, summarize, or proofread that. Send the text or assignment, plus the audience, tone, length, and any rules your teacher gave you.";
  if (lower.includes('brainstorm')) return "Absolutely. I can help generate ideas, compare them, and turn the best one into a plan. What subject is the project for, and what requirements or deadline do you have?";
  if (lower.includes('?') || prev) return `Good question. I can work through it with you, but I don\u2019t want to guess at missing details. Share the exact wording, any answer choices or numbers, and what you\u2019ve tried so far. I\u2019ll explain the reasoning step by step.`;
  return `Absolutely \u2014 I can help you think that through. Tell me a little more about what you need, and I\u2019ll give you a clear answer with examples or step-by-step reasoning when it helps. If this is for school, you can send the exact question, your grade level, and anything you\u2019ve tried so far.`;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('fex-dark-mode') === 'true');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem('fex-model') || 'claude-sonnet');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fex-conversations') || '[]');
    } catch { return []; }
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [toast, setToast] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();

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
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(''), 2200);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || isTyping) return;

    const time = formatTime();
    const userMsg: ChatMessage = { role: 'user', text, time };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setPrompt('');
    setAttachments([]);

    let newIndex = activeIndex;
    let newConversations = [...savedConversations];

    if (activeIndex < 0) {
      newIndex = savedConversations.length;
      const title = text.split('\n')[0].slice(0, 40) || 'New chat';
      newConversations.push({ title, messages: [...newMessages] });
    } else {
      newConversations[activeIndex] = { ...newConversations[activeIndex], messages: [...newMessages] };
    }

    setActiveIndex(newIndex);
    setSavedConversations(newConversations);
    setIsTyping(true);

    const response = replyTo(text, messages.length >= 2 ? messages[messages.length - 2].text : undefined);
    const delay = Math.min(1500, Math.max(650, response.length * 10));

    setTimeout(() => {
      const assistantMsg: ChatMessage = { role: 'assistant', text: response, time: formatTime() };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      setIsTyping(false);

      setSavedConversations(prev => {
        const copy = [...prev];
        if (newIndex >= 0 && copy[newIndex]) {
          copy[newIndex] = { ...copy[newIndex], messages: updatedMessages };
        }
        return copy;
      });
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const resetChat = () => {
    setActiveIndex(-1);
    setMessages([]);
    setAttachments([]);
    setPrompt('');
    setSidebarOpen(false);
  };

  const loadConversation = (index: number) => {
    const item = savedConversations[index];
    if (!item) return;
    setActiveIndex(index);
    setMessages(item.messages || []);
    setSidebarOpen(false);
  };

  const clearChat = () => {
    if (activeIndex >= 0) {
      setSavedConversations(prev => prev.filter((_, i) => i !== activeIndex));
    }
    resetChat();
    showToast('Chat cleared');
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

  const chatTitles = savedConversations.map(c => c.title);

  const hoverBg = darkMode ? '#292825' : '#e5e2db';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen flex flex-col z-30 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{ width: 270, padding: '24px 16px 14px', background: 'var(--sidebar)', borderRight: '1px solid var(--line)' }}
        aria-label="Conversation navigation"
      >
        <div className="flex items-center gap-2 px-2.5 pb-7 text-xl font-semibold tracking-tight">
          <span style={{ color: 'var(--accent)', fontSize: 26 }}>✦</span>
          <span>Claude</span>
        </div>

        <button
          onClick={() => { resetChat(); }}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-left font-semibold transition-colors"
          style={{ border: '1px solid #cbc7be', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span>＋</span> New chat
        </button>

        <nav className="flex-1 overflow-y-auto pt-5 conversation-list" aria-label="Conversations">
          {chatTitles.map((title, i) => (
            <button
              key={i}
              onClick={() => loadConversation(i)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition-colors ${
                i === activeIndex ? 'font-medium' : ''
              }`}
              style={{
                background: i === activeIndex ? (darkMode ? '#302e2a' : '#e2dfd8') : 'transparent',
                color: i === activeIndex ? 'var(--text)' : '#585650',
              }}
              onMouseEnter={e => {
                if (i !== activeIndex) e.currentTarget.style.background = hoverBg;
              }}
              onMouseLeave={e => {
                if (i !== activeIndex) e.currentTarget.style.background = 'transparent';
              }}
            >
              {title}
            </button>
          ))}
        </nav>

        <div className="grid gap-1.5 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-lg text-left text-sm transition-colors"
            style={{ background: 'transparent', color: '#5d5a54' }}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            ☾ <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button
            onClick={() => showToast('Account settings are not available in this demo')}
            className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-lg text-left text-sm transition-colors"
            style={{ background: 'transparent', color: '#5d5a54' }}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="grid place-items-center w-7 h-7 rounded-full text-white text-xs" style={{ background: '#b7a18a' }}>Y</span>
            <span>Your account</span>
            <span className="ml-auto tracking-widest">•••</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-screen md:ml-[270px]">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8">
          <button
            className="md:hidden bg-transparent text-xl"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <label className="flex items-center gap-2 mx-auto text-sm cursor-pointer">
            <span className="w-2 h-2 rounded-full" style={{ background: '#61a878' }}></span>
            <select
              value={model}
              onChange={e => {
                setModel(e.target.value);
                const opt = e.target.options[e.target.selectedIndex];
                showToast(`${opt.text} selected`);
              }}
              className="appearance-none border-0 outline-0 px-0.5 py-1 bg-transparent cursor-pointer font-semibold text-sm"
              style={{ color: 'var(--text)' }}
              aria-label="Choose Claude model"
            >
              <option value="claude-sonnet" style={{ background: 'var(--panel)', color: 'var(--text)' }}>Claude Sonnet</option>
              <option value="claude-opus" style={{ background: 'var(--panel)', color: 'var(--text)' }}>Claude Opus</option>
              <option value="claude-haiku" style={{ background: 'var(--panel)', color: 'var(--text)' }}>Claude Haiku</option>
            </select>
            <span className="pointer-events-none -ml-1 text-lg" style={{ color: 'var(--muted)' }}>⌄</span>
          </label>

          <button
            onClick={clearChat}
            className="px-3 py-2 rounded-md text-xs transition-colors"
            style={{ background: 'transparent', color: 'var(--muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = darkMode ? '#292825' : '#eae8e1'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            Clear chat
          </button>
        </header>

        {/* Chat Shell */}
        <section className="flex flex-col mx-auto px-4 md:px-6 pb-6" style={{ minHeight: 'calc(100vh - 64px)', maxWidth: 850, paddingTop: '7vh' }}>
          <div className="flex-1" aria-live="polite">
            {messages.length === 0 && !isTyping && (
              <div className="text-center mx-auto" style={{ padding: '10vh 0 5vh' }}>
                <div className="text-4xl mb-4" style={{ color: 'var(--accent)' }}>✦</div>
                <h1 className="m-0 tracking-tight" style={{ font: "500 clamp(30px, 4vw, 43px)/1.15 'Newsreader', Georgia, serif" }}>
                  How can I help you today?
                </h1>
                <p className="my-4 mb-7" style={{ color: 'var(--muted)' }}>Ask me anything, or try one of these ideas.</p>
                <div className="flex justify-center flex-wrap gap-2">
                  {[
                    { label: 'Brainstorm ideas', prompt: 'Help me brainstorm ideas for a project' },
                    { label: 'Explain a complex topic', prompt: 'Explain quantum computing simply' },
                    { label: 'Help me write', prompt: 'Help me write an email' },
                    { label: 'Summarize something', prompt: 'Summarize a long article for me' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { setPrompt(item.prompt); textareaRef.current?.focus(); }}
                      className="px-3.5 py-2.5 rounded-full text-xs transition-colors"
                      style={{ border: '1px solid var(--line)', background: 'var(--panel)', color: '#625f59' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = '#625f59'; }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 max-w-[720px] mx-auto my-7 leading-relaxed ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-full text-white text-sm" style={{ background: 'var(--accent)' }}>
                    ✦
                  </div>
                )}
                <div className={msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[90%]'}>
                  {msg.role === 'user' ? (
                    <div className="px-4 py-3" style={{ background: darkMode ? '#34312c' : '#e8e3da', borderRadius: '16px 16px 4px 16px' }}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      <div className="text-xs mt-1 opacity-85" style={{ color: 'var(--muted)' }}>{msg.time}</div>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                      <div className="text-xs mt-1 opacity-85" style={{ color: 'var(--muted)' }}>Claude · {msg.time}</div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 max-w-[720px] mx-auto my-7">
                <div className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-full text-white text-sm" style={{ background: 'var(--accent)' }}>
                  ✦
                </div>
                <div className="flex items-center gap-1 min-w-[52px] px-4 py-3">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form onSubmit={handleSubmit} className="sticky bottom-0 pt-5" style={{ background: `linear-gradient(transparent, var(--bg) 22%)` }}>
            <div
              className="rounded-2xl px-3.5 pt-3 pb-2"
              style={{ border: '1px solid #cfcac0', background: 'var(--panel)', boxShadow: 'var(--shadow)' }}
            >
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="How can I help you today?"
                className="block w-full min-h-7 max-h-44 resize-none border-0 outline-0 bg-transparent leading-normal text-sm"
                style={{ color: 'var(--text)' }}
                aria-label="Write your prompt"
              />

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {attachments.map((file, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs"
                      style={{ background: darkMode ? '#2d2c2a' : '#eeeae3', color: 'var(--muted)' }}
                    >
                      {file.name}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="bg-transparent text-sm leading-none p-0"
                        style={{ color: '#8d8880' }}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
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
                  className="w-7 h-7 rounded-full text-xl transition-colors"
                  style={{ background: 'transparent', color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = darkMode ? '#292825' : '#eeeae3')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  aria-label="Attach a file"
                >
                  ＋
                </button>
                <span className="flex-1 text-center text-xs hidden md:block" style={{ color: '#aaa69e' }}>
                  Claude can make mistakes. Check important info.
                </span>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isTyping}
                  className="w-8 h-8 rounded-lg text-white text-xl leading-none transition-opacity disabled:opacity-30 cursor-pointer"
                  style={{ background: 'var(--text)' }}
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
        className={`fixed left-1/2 bottom-6 z-10 px-4 py-2.5 rounded-lg text-xs text-white pointer-events-none transition-all duration-200 ${
          toast ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: `translateX(-50%) ${toast ? 'translateY(0)' : 'translateY(20px)'}`,
          background: '#2d2b28'
        }}
        role="status"
      >
        {toast}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ background: 'rgba(0,0,0,0.3)' }}
        />
      )}
    </div>
  );
}
