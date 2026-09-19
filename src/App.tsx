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

// Store HTML content for code blocks (avoids data attribute escaping issues)
const htmlCodeStore: Record<string, string> = {};

function formatMessage(text: string): string {
  // First, extract code blocks before escaping
  const codeBlocks: Array<{ placeholder: string; lang: string; code: string }> = [];
  let processedText = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const id = `cb-${Math.random().toString(36).slice(2, 11)}`;
    const language = lang || 'code';
    codeBlocks.push({ placeholder: id, lang: language, code: code.trim() });
    return `\n\u0000${id}\u0000\n`;
  });
  
  // Now escape the rest
  processedText = escapeHtml(processedText);
  
  // Apply formatting
  processedText = processedText
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<span class="list-item">• $1</span>')
    .replace(/^(\d+)\. (.+)/gm, '<span class="list-item">$1. $2</span>')
    .replace(/^---$/gm, '<hr class="my-3 opacity-20" />')
    .replace(/\n/g, '<br>');
  
  // Replace code block placeholders with rendered code blocks
  codeBlocks.forEach(({ placeholder, lang, code }) => {
    const escapedCode = escapeHtml(code);
    const isHtml = lang.toLowerCase() === 'html';
    
    // Store HTML content for preview/download
    if (isHtml) {
      htmlCodeStore[placeholder] = code;
    }
    
    let actionsHtml = '';
    if (isHtml) {
      actionsHtml = `
        <button class="code-action-btn" data-action="preview" data-store-id="${placeholder}" title="Preview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>
        <button class="code-action-btn" data-action="download" data-store-id="${placeholder}" title="Download">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
        <button class="code-action-btn" data-action="copy" data-store-id="${placeholder}" title="Copy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy
        </button>`;
    } else {
      actionsHtml = `
        <button class="code-action-btn" data-action="copy-code" data-code="${escapeHtml(code)}" title="Copy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy
        </button>`;
    }
    
    const blockHtml = `<div class="code-block ${isHtml ? 'html-block' : ''}">
      <div class="code-header">
        <span class="code-lang">${lang.toUpperCase() || 'CODE'}</span>
        <div class="code-actions">${actionsHtml}</div>
      </div>
      <pre><code>${escapedCode}</code></pre>
    </div>`;
    
    processedText = processedText.replace(`\u0000${placeholder}\u0000`, blockHtml);
  });
  
  return processedText;
}

function replyTo(text: string, previous?: string): string {
  const lower = text.toLowerCase().trim();
  const prev = previous?.toLowerCase() || '';
  const nameMatch = text.match(/(?:my name is|call me)\s+([a-z][a-z '-]{1,30})/i);

  if (nameMatch) return `Nice to meet you, **${nameMatch[1].trim()}**! I\u2019ll remember that for this conversation.\n\nWhat would you like to work on?`;
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|sup)\b/i.test(text)) return "Hey! It\u2019s good to hear from you. \u2728\n\nWe can talk about whatever is on your mind\u2014your day, ideas, entertainment, relationships, plans, or something completely random.\n\nWhat\u2019s up?";
  if (/\b(thanks|thank you|thx)\b/.test(lower)) return "You\u2019re welcome! I\u2019m happy to help\u2014or we can just keep chatting. What are you thinking about?";
  if (lower.includes('how are you')) return "I\u2019m doing well and glad you\u2019re here. How are you doing today?";
  if (/\b(i am|i'm|im|i feel)\s+(sad|depressed|lonely|upset|angry|stressed|anxious|tired|happy|excited|bored|confused)\b/i.test(text)) return "Thanks for telling me. That sounds like a real feeling, and you don\u2019t have to explain it perfectly.\n\n- Vent about what\u2019s going on\n- Figure out what caused it\n- Think of something that might help right now\n\nJust let me know which direction feels right.";
  if (/\b(lonely|no friends|friendless|feel alone)\b/.test(lower)) return "I\u2019m sorry you\u2019re feeling alone. I can keep you company and listen.\n\nIf you want, tell me what happened today, or we can talk about a hobby, show, game, or topic you enjoy. Sometimes just having someone to chat with makes a difference.";
  if (/\b(boyfriend|girlfriend|crush|dating|relationship|breakup|love|friend drama)\b/.test(lower)) return "Relationships can be complicated. I can listen without judging, help you sort out what you\u2019re feeling, or help draft a message. What happened?";
  if (/\b(bored|fun|entertain me|something to do|activity)\b/.test(lower)) return "Let\u2019s fix that! Here are some ideas:\n\n- Play **20 questions** or **would you rather**\n- Make up a story together\n- Brainstorm a weird invention\n- Do a trivia quiz\n- Plan a meal or trip\n- Talk about movies, music, or games\n\nPick a direction\u2014or say \u201csurprise me.\u201d";
  if (/\b(joke|make me laugh|funny)\b/.test(lower)) return "Why did the computer go to the doctor?\n\nBecause it had a virus! 😄\n\n---\n\nI\u2019ll be here all week\u2014try the assistant!";
  if (/\b(movie|film|tv|television|show|series|anime|book|music|song|game|gaming)\b/.test(lower)) return "I\u2019d love to talk about that! Tell me what you\u2019re watching, reading, listening to, or playing.\n\nI can discuss:\n- Themes and symbolism\n- Character development\n- Recommendations based on your taste\n- Hot takes and debates\n\nWhat\u2019s on your mind?";
  if (/\b(opinion|think about|thoughts on|favorite|recommend)\b/.test(lower)) return "I can give you a thoughtful take, compare different perspectives, or help you decide. Tell me the topic and what matters most to you.";
  if (/\b(my day|today|this morning|this week|weekend|plans|plan my day)\b/.test(lower)) return "Tell me what your day looks like and what you want to get done.\n\nI can help:\n- **Prioritize** your tasks\n- Make a **realistic plan**\n- Talk through how things are going\n\nWhat\u2019s on your plate?";
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
    return "I can help debug code, explain programming concepts, or design an algorithm.\n\nShare:\n- The **code** you have\n- The **expected result**\n- What **actually happens**\n\nI\u2019ll explain the fix so you can understand it, not just copy it.\n\n```javascript\n// Example: I can help with code like this\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n```";
  }
  
  // HTML generation requests
  if (/\b(generate|create|make|build|design)\b.*\b(html|page|website|landing|template)\b/i.test(lower)) {
    return "I'll create an HTML page for you! Here's a modern, responsive template:\n\n```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Generated Page</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n      min-height: 100vh;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      color: white;\n    }\n    .container {\n      text-align: center;\n      padding: 2rem;\n      max-width: 600px;\n    }\n    h1 {\n      font-size: 3rem;\n      margin-bottom: 1rem;\n      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);\n    }\n    p {\n      font-size: 1.25rem;\n      opacity: 0.9;\n      margin-bottom: 2rem;\n    }\n    .btn {\n      display: inline-block;\n      padding: 1rem 2rem;\n      background: white;\n      color: #667eea;\n      text-decoration: none;\n      border-radius: 50px;\n      font-weight: 600;\n      transition: transform 0.2s;\n    }\n    .btn:hover {\n      transform: translateY(-2px);\n    }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <h1>Welcome!</h1>\n    <p>This is a generated HTML page with modern styling.</p>\n    <a href=\"#\" class=\"btn\">Get Started</a>\n  </div>\n</body>\n</html>\n```\n\nYou can **Preview** this to see it rendered, **Download** it as an HTML file, or **Copy** the code.";
  }
  
  if (/\b(button|form|card|component|widget)\b.*\b(html|css)\b/i.test(lower) || /\b(html|css)\b.*\b(button|form|card|component|widget)\b/i.test(lower)) {
    return "Here's a modern card component with HTML and CSS:\n\n```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Card Component</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n      background: #f5f5f5;\n      min-height: 100vh;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      padding: 2rem;\n    }\n    .card {\n      background: white;\n      border-radius: 16px;\n      overflow: hidden;\n      box-shadow: 0 10px 40px rgba(0,0,0,0.1);\n      max-width: 400px;\n      transition: transform 0.3s;\n    }\n    .card:hover {\n      transform: translateY(-8px);\n    }\n    .card-image {\n      width: 100%;\n      height: 200px;\n      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      font-size: 4rem;\n    }\n    .card-content {\n      padding: 1.5rem;\n    }\n    .card-title {\n      font-size: 1.5rem;\n      font-weight: 600;\n      margin-bottom: 0.5rem;\n      color: #1a1a1a;\n    }\n    .card-text {\n      color: #666;\n      line-height: 1.6;\n      margin-bottom: 1.5rem;\n    }\n    .card-btn {\n      display: inline-block;\n      padding: 0.75rem 1.5rem;\n      background: #667eea;\n      color: white;\n      text-decoration: none;\n      border-radius: 8px;\n      font-weight: 500;\n      transition: background 0.2s;\n    }\n    .card-btn:hover {\n      background: #5568d3;\n    }\n  </style>\n</head>\n<body>\n  <div class=\"card\">\n    <div class=\"card-image\">🎨</div>\n    <div class=\"card-content\">\n      <h2 class=\"card-title\">Beautiful Card</h2>\n      <p class=\"card-text\">This is a modern card component with smooth hover effects and clean design.</p>\n      <a href=\"#\" class=\"card-btn\">Learn More</a>\n    </div>\n  </div>\n</body>\n</html>\n```\n\nClick **Preview** to see it in action!";
  }
  
  // Dashboard/analytics HTML
  if (/\b(dashboard|analytics|chart|graph|stats|metrics)\b.*\b(html|page|web)\b/i.test(lower)) {
    return "Here's a modern dashboard layout:\n\n```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Dashboard</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n      background: #0f172a;\n      color: white;\n      min-height: 100vh;\n      padding: 2rem;\n    }\n    .header {\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      margin-bottom: 2rem;\n    }\n    .header h1 { font-size: 1.75rem; font-weight: 700; }\n    .stats-grid {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n      gap: 1.5rem;\n      margin-bottom: 2rem;\n    }\n    .stat-card {\n      background: #1e293b;\n      border-radius: 16px;\n      padding: 1.5rem;\n      border: 1px solid #334155;\n    }\n    .stat-label { font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.5rem; }\n    .stat-value { font-size: 2rem; font-weight: 700; }\n    .stat-change { font-size: 0.75rem; color: #4ade80; margin-top: 0.25rem; }\n    .chart-area {\n      background: #1e293b;\n      border-radius: 16px;\n      padding: 1.5rem;\n      border: 1px solid #334155;\n      height: 300px;\n      display: flex;\n      align-items: flex-end;\n      gap: 8px;\n    }\n    .bar {\n      flex: 1;\n      background: linear-gradient(to top, #6366f1, #8b5cf6);\n      border-radius: 8px 8px 0 0;\n      min-height: 20px;\n      transition: height 0.3s;\n    }\n  </style>\n</head>\n<body>\n  <div class=\"header\">\n    <h1>Dashboard</h1>\n    <span style=\"color: #94a3b8;\">Last 7 days</span>\n  </div>\n  <div class=\"stats-grid\">\n    <div class=\"stat-card\">\n      <div class=\"stat-label\">Total Revenue</div>\n      <div class=\"stat-value\">$45,231</div>\n      <div class=\"stat-change\">↑ 20.1% from last month</div>\n    </div>\n    <div class=\"stat-card\">\n      <div class=\"stat-label\">Subscriptions</div>\n      <div class=\"stat-value\">+2,350</div>\n      <div class=\"stat-change\">↑ 180.1% from last month</div>\n    </div>\n    <div class=\"stat-card\">\n      <div class=\"stat-label\">Active Users</div>\n      <div class=\"stat-value\">12,234</div>\n      <div class=\"stat-change\">↑ 19% from last month</div>\n    </div>\n  </div>\n  <div class=\"chart-area\">\n    <div class=\"bar\" style=\"height: 40%\"></div>\n    <div class=\"bar\" style=\"height: 65%\"></div>\n    <div class=\"bar\" style=\"height: 45%\"></div>\n    <div class=\"bar\" style=\"height: 80%\"></div>\n    <div class=\"bar\" style=\"height: 55%\"></div>\n    <div class=\"bar\" style=\"height: 90%\"></div>\n    <div class=\"bar\" style=\"height: 70%\"></div>\n  </div>\n</body>\n</html>\n```\n\nClick **Preview** to see the dashboard!";
  }
  
  // Generic HTML generation for any page request
  if (/\b(html|page|website|site)\b/i.test(lower) && /\b(make|create|generate|build|design|show|give)\b/i.test(lower)) {
    return "I'll generate an HTML page for you! Here's a clean, modern design:\n\n```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>My Page</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n      background: #fafafa;\n      color: #1a1a1a;\n    }\n    nav {\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      padding: 1.5rem 3rem;\n      background: white;\n      border-bottom: 1px solid #eee;\n    }\n    .logo { font-size: 1.25rem; font-weight: 700; }\n    .nav-links { display: flex; gap: 2rem; }\n    .nav-links a { text-decoration: none; color: #666; font-size: 0.9rem; }\n    .hero {\n      text-align: center;\n      padding: 6rem 2rem;\n      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n      color: white;\n    }\n    .hero h1 { font-size: 3rem; margin-bottom: 1rem; }\n    .hero p { font-size: 1.25rem; opacity: 0.9; max-width: 600px; margin: 0 auto 2rem; }\n    .cta-btn {\n      display: inline-block;\n      padding: 1rem 2.5rem;\n      background: white;\n      color: #667eea;\n      text-decoration: none;\n      border-radius: 50px;\n      font-weight: 600;\n      font-size: 1rem;\n      transition: transform 0.2s;\n    }\n    .cta-btn:hover { transform: scale(1.05); }\n    .features {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n      gap: 2rem;\n      padding: 4rem 3rem;\n      max-width: 1200px;\n      margin: 0 auto;\n    }\n    .feature {\n      text-align: center;\n      padding: 2rem;\n    }\n    .feature-icon { font-size: 2.5rem; margin-bottom: 1rem; }\n    .feature h3 { margin-bottom: 0.5rem; }\n    .feature p { color: #666; line-height: 1.6; }\n  </style>\n</head>\n<body>\n  <nav>\n    <div class=\"logo\">MyBrand</div>\n    <div class=\"nav-links\">\n      <a href=\"#\">Features</a>\n      <a href=\"#\">Pricing</a>\n      <a href=\"#\">About</a>\n    </div>\n  </nav>\n  <section class=\"hero\">\n    <h1>Build Something Amazing</h1>\n    <p>Create beautiful websites and applications with modern tools and best practices.</p>\n    <a href=\"#\" class=\"cta-btn\">Get Started</a>\n  </section>\n  <section class=\"features\">\n    <div class=\"feature\">\n      <div class=\"feature-icon\">⚡</div>\n      <h3>Lightning Fast</h3>\n      <p>Optimized for speed and performance out of the box.</p>\n    </div>\n    <div class=\"feature\">\n      <div class=\"feature-icon\">🎨</div>\n      <h3>Beautiful Design</h3>\n      <p>Modern, clean aesthetics that look great on any device.</p>\n    </div>\n    <div class=\"feature\">\n      <div class=\"feature-icon\">🔒</div>\n      <h3>Secure</h3>\n      <p>Built with security best practices from the ground up.</p>\n    </div>\n  </section>\n</body>\n</html>\n```\n\nYou can **Preview**, **Download**, or **Copy** this HTML!";
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
    try { return JSON.parse(localStorage.getItem('fex-conversations') || '[]'); }
    catch { return []; }
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [toast, setToast] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('HTML Preview');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'chat' | 'data' | 'about'>('profile');
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fex-settings') || '{}');
      return {
        name: saved.name || 'You',
        email: saved.email || '',
        bio: saved.bio || '',
        fontSize: saved.fontSize || 'medium',
        sendOnEnter: saved.sendOnEnter !== false,
        showTimestamps: saved.showTimestamps !== false,
        streamingEnabled: saved.streamingEnabled !== false,
        compactMode: saved.compactMode || false,
        accentColor: saved.accentColor || 'amber',
      };
    } catch {
      return {
        name: 'You',
        email: '',
        bio: '',
        fontSize: 'medium',
        sendOnEnter: true,
        showTimestamps: true,
        streamingEnabled: true,
        compactMode: false,
        accentColor: 'amber',
      };
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();
  const streamInterval = useRef<ReturnType<typeof setInterval>>();
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

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
    localStorage.setItem('fex-settings', JSON.stringify(settings));
    // Apply font size
    const sizes: Record<string, string> = { small: '13px', medium: '14px', large: '16px' };
    document.documentElement.style.setProperty('--chat-font-size', sizes[settings.fontSize] || '14px');
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isTyping, streamingText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [prompt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); resetChat(); }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); textareaRef.current?.focus(); }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); setShowSettings(true); }
      if (e.key === 'Escape') { setSidebarOpen(false); setShowSearch(false); setShowSettings(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(''), 2500);
  }, []);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      showToast('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, [showToast]);

  const handleCodeAction = useCallback((action: string, storeId?: string, code?: string) => {
    const htmlContent = storeId ? htmlCodeStore[storeId] : code;
    
    if (!htmlContent) return;
    
    if (action === 'copy' || action === 'copy-code') {
      navigator.clipboard.writeText(htmlContent).then(() => {
        showToast('Code copied to clipboard');
      });
    } else if (action === 'download') {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('HTML file downloaded');
    } else if (action === 'preview') {
      setPreviewHtml(htmlContent);
      setPreviewTitle(`HTML Preview - ${new Date().toLocaleTimeString()}`);
    }
  }, [showToast]);

  // Handle code block button clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.code-action-btn') as HTMLElement;
      if (button) {
        const action = button.dataset.action;
        const storeId = button.dataset.storeId;
        const code = button.dataset.code;
        if (action) {
          handleCodeAction(action, storeId, code);
        }
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleCodeAction]);
  
  // Close preview on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewHtml) {
        setPreviewHtml(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewHtml]);

  const streamResponse = useCallback((fullText: string, newMessages: ChatMessage[], newIndex: number) => {
    setIsTyping(true);
    setStreamingText('');
    let currentIndex = 0;
    const charsPerTick = Math.max(2, Math.floor(fullText.length / 80));

    streamInterval.current = setInterval(() => {
      currentIndex += charsPerTick;
      if (currentIndex >= fullText.length) {
        currentIndex = fullText.length;
        clearInterval(streamInterval.current);
        const assistantMsg: ChatMessage = { role: 'assistant', text: fullText, time: formatTime(), id: generateId() };
        const updatedMessages = [...newMessages, assistantMsg];
        setMessages(updatedMessages);
        setIsTyping(false);
        setStreamingText('');
        setSavedConversations(prev => {
          const copy = [...prev];
          if (newIndex >= 0 && copy[newIndex]) copy[newIndex] = { ...copy[newIndex], messages: updatedMessages };
          return copy;
        });
      } else {
        setStreamingText(fullText.slice(0, currentIndex));
      }
    }, 20);
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
    const newConversations = [...savedConversations];
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
    setTimeout(() => streamResponse(response, newMessages, newIndex), Math.min(600, Math.max(200, response.length * 2)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && settings.sendOnEnter) { e.preventDefault(); handleSubmit(e); }
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
    if (activeIndex >= 0) setSavedConversations(prev => prev.filter((_, i) => i !== activeIndex));
    resetChat();
    showToast('Chat cleared');
  };

  const exportChat = () => {
    if (messages.length === 0) { showToast('No messages to export'); return; }
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

  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

  const filteredConversations = savedConversations
    .map((c, i) => ({ ...c, originalIndex: i }))
    .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ background: 'var(--bg)' }}>
      {/* Ambient Background */}
      <div className="ambient-bg">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>
      <div className="noise-overlay" />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen flex flex-col z-30 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ width: 290, background: 'var(--sidebar)', borderRight: '1px solid var(--line)' }}
      >
        <div className="glass absolute inset-0" style={{ zIndex: -1 }} />

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-6">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold animate-breathe" style={{ background: 'var(--accent-gradient)' }}>
              ✦
            </div>
            <div className="absolute inset-0 rounded-xl animate-breathe" style={{ background: 'var(--accent-gradient)', filter: 'blur(8px)', opacity: 0.4 }} />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>Claude</div>
            <div className="text-[10px] font-medium tracking-wide uppercase" style={{ color: 'var(--muted)' }}>AI Assistant</div>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-3 pb-2">
          <button
            onClick={() => { resetChat(); }}
            className="btn-premium flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-left text-sm font-semibold"
            style={{ background: 'var(--accent-gradient)', color: 'white', boxShadow: 'var(--shadow)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            New chat
            <span className="ml-auto text-xs opacity-60 hidden lg:inline">⌘K</span>
          </button>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="px-3 pb-2 animate-fade-in">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border-0 outline-none"
                style={{ background: 'var(--line)', color: 'var(--text)' }}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Conversation List */}
        <nav className="flex-1 overflow-y-auto premium-scroll px-2 py-2" aria-label="Conversations">
          {filteredConversations.length === 0 && searchQuery && (
            <p className="text-center text-xs py-8" style={{ color: 'var(--muted)' }}>No matches found</p>
          )}
          {filteredConversations.map((conv) => (
            <button
              key={conv.originalIndex}
              onClick={() => loadConversation(conv.originalIndex)}
              className={`sidebar-item group flex items-center w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                conv.originalIndex === activeIndex ? 'active font-medium' : ''
              }`}
              style={{
                background: conv.originalIndex === activeIndex ? 'var(--accent-glow)' : 'transparent',
                color: conv.originalIndex === activeIndex ? 'var(--text)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (conv.originalIndex !== activeIndex) e.currentTarget.style.background = 'var(--line)'; }}
              onMouseLeave={e => { if (conv.originalIndex !== activeIndex) e.currentTarget.style.background = 'transparent'; }}
            >
              <svg className="flex-shrink-0 mr-2.5 opacity-40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span className="truncate flex-1">{conv.title}</span>
              <span
                className="ml-2 opacity-0 group-hover:opacity-60 text-xs cursor-pointer flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/10 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setSavedConversations(prev => prev.filter((_, i) => i !== conv.originalIndex));
                  if (conv.originalIndex === activeIndex) resetChat();
                  showToast('Deleted');
                }}
              >
                ×
              </span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 pb-4 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="grid gap-0.5 pt-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-sm transition-all duration-150"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <span>Search chats</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-sm transition-all duration-150"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span>Settings</span>
              <span className="ml-auto opacity-40 text-xs hidden lg:inline">⌘,</span>
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-sm transition-all duration-150"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {darkMode ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
              <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-sm transition-all duration-150"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--accent-gradient)' }}>
                {settings.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{settings.name}</span>
              <span className="ml-auto opacity-40 text-xs">•••</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="h-screen lg:ml-[290px] flex flex-col relative z-10">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 glass" style={{ borderBottom: '1px solid var(--line)' }}>
          <button
            className="lg:hidden p-2 rounded-xl transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>

          <div className="flex items-center gap-2 mx-auto">
            <div className="relative">
              <span className="status-online w-2 h-2 rounded-full block" style={{ background: '#4ade80' }} />
            </div>
            <select
              value={model}
              onChange={e => {
                setModel(e.target.value);
                showToast(`${e.target.options[e.target.selectedIndex].text} selected`);
              }}
              className="appearance-none border-0 outline-0 px-2 py-1 bg-transparent cursor-pointer font-semibold text-sm"
              style={{ color: 'var(--text)' }}
              aria-label="Choose Claude model"
            >
              <option value="claude-sonnet" style={{ background: 'var(--panel)' }}>Claude Sonnet</option>
              <option value="claude-opus" style={{ background: 'var(--panel)' }}>Claude Opus</option>
              <option value="claude-haiku" style={{ background: 'var(--panel)' }}>Claude Haiku</option>
            </select>
            <svg className="opacity-40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={exportChat}
              className="tooltip p-2 rounded-xl transition-all duration-150"
              data-tooltip="Export chat"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--line)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
            </button>
            <button
              onClick={clearChat}
              className="tooltip px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150"
              data-tooltip="Clear conversation"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--line)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              Clear
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto premium-scroll" style={{ scrollBehavior: 'smooth' }}>
          <div className="max-w-[800px] mx-auto px-4 lg:px-6 py-6">
            {/* Empty State */}
            {messages.length === 0 && !isTyping && !streamingText && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
                {/* Animated Logo */}
                <div className="relative mb-8">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl animate-float" style={{ background: 'var(--accent-gradient)', boxShadow: '0 20px 60px rgba(201, 106, 58, 0.3)' }}>
                    ✦
                  </div>
                  <div className="absolute inset-0 rounded-3xl animate-float" style={{ background: 'var(--accent-gradient)', filter: 'blur(24px)', opacity: 0.3, animationDelay: '0.5s' }} />
                  <div className="absolute -inset-4 rounded-full animate-spin-slow" style={{ border: '1px dashed var(--line-strong)', opacity: 0.5 }} />
                </div>

                <h1 className="text-center mb-2" style={{ font: "600 clamp(28px, 4vw, 38px)/1.2 'Newsreader', Georgia, serif", letterSpacing: '-0.5px', color: 'var(--text)' }}>
                  How can I help you today?
                </h1>
                <p className="text-sm text-center mb-10 max-w-sm" style={{ color: 'var(--muted)' }}>
                  I can answer questions, help you write, brainstorm ideas, explain complex topics, and more.
                </p>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    { icon: '💡', label: 'Brainstorm', desc: 'Generate creative ideas', prompt: 'Help me brainstorm ideas for a project' },
                    { icon: '🌐', label: 'Generate HTML', desc: 'Create web pages & components', prompt: 'Generate an HTML landing page' },
                    { icon: '🧠', label: 'Explain', desc: 'Break down complex topics', prompt: 'Explain quantum computing simply' },
                    { icon: '✍️', label: 'Write', desc: 'Draft emails & documents', prompt: 'Help me write an email' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { setPrompt(item.prompt); textareaRef.current?.focus(); }}
                      className="suggestion-card flex flex-col items-start gap-1.5 p-4 rounded-2xl text-left border"
                      style={{ background: 'var(--panel)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-sm)' }}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.label}</span>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{item.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-10 text-[10px] font-medium" style={{ color: 'var(--muted-subtle)' }}>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--line)', border: '1px solid var(--line-strong)' }}>⌘K</kbd>
                    New chat
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--line)', border: '1px solid var(--line-strong)' }}>⌘/</kbd>
                    Focus input
                  </span>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`message-row flex gap-3.5 py-4 ${msg.role === 'user' ? 'justify-end animate-slide-right' : 'animate-slide-left'}`}
                style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s`, animationFillMode: 'both' }}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs" style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px rgba(201, 106, 58, 0.2)' }}>
                    ✦
                  </div>
                )}
                <div className={`relative group ${msg.role === 'user' ? 'max-w-[75%]' : 'max-w-[85%]'}`}>
                  {msg.role === 'user' ? (
                    <div className="px-4 py-3 text-sm leading-relaxed" style={{ background: 'var(--accent-gradient)', color: 'white', borderRadius: '20px 20px 4px 20px', boxShadow: '0 4px 16px rgba(201, 106, 58, 0.15)' }}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  ) : (
                    <div className="rounded-2xl px-4 py-3.5 leading-relaxed" style={{ background: 'var(--panel)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', fontSize: 'var(--chat-font-size)' }}>
                      <div className="whitespace-pre-wrap" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                    </div>
                  )}
                  <div className={`flex items-center gap-2 mt-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--muted-subtle)' }}>
                      {msg.role === 'user' ? 'You' : 'Claude'} · {msg.time}
                    </span>
                    {msg.role === 'assistant' && (
                      <div className="msg-actions flex items-center gap-0.5">
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="p-1 rounded-md transition-all duration-150"
                          style={{ color: 'var(--muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-glow)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}
                          title="Copy"
                        >
                          {copiedId === msg.id ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming */}
            {streamingText && (
              <div className="flex gap-3.5 py-4 animate-slide-left">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs" style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px rgba(201, 106, 58, 0.2)' }}>
                  ✦
                </div>
                <div className="max-w-[85%]">
                  <div className="rounded-2xl px-4 py-3.5 text-sm leading-relaxed" style={{ background: 'var(--panel)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="whitespace-pre-wrap" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: formatMessage(streamingText) }} />
                    <span className="streaming-cursor" />
                  </div>
                </div>
              </div>
            )}

            {/* Typing */}
            {isTyping && !streamingText && (
              <div className="flex gap-3.5 py-4 animate-slide-left">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs" style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px rgba(201, 106, 58, 0.2)' }}>
                  ✦
                </div>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Composer */}
        <div className="flex-shrink-0 px-4 lg:px-6 pb-4 pt-2">
          <form onSubmit={handleSubmit} className="max-w-[800px] mx-auto">
            <div className="composer-glow rounded-2xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)' }}>
              <div className="p-4 pb-2">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Message Claude..."
                  className="block w-full min-h-[28px] max-h-[220px] resize-none border-0 outline-0 bg-transparent leading-relaxed text-sm placeholder:opacity-40"
                  style={{ color: 'var(--text)', fontFamily: 'inherit' }}
                  aria-label="Write your prompt"
                />
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-2">
                  {attachments.map((file, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium animate-scale-in"
                      style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                      {file.name}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="ml-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] hover:bg-black/10 transition-colors"
                        style={{ color: 'var(--accent)' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom Bar */}
              <div className="flex items-center justify-between px-3 pb-3 pt-1">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" hidden multiple onChange={handleFileChange} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="tooltip p-2 rounded-xl transition-all duration-200"
                    data-tooltip="Attach file"
                    style={{ color: 'var(--muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--line)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium hidden sm:block" style={{ color: 'var(--muted-subtle)' }}>
                    Claude can make mistakes
                  </span>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isTyping}
                    className="btn-premium w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: prompt.trim() && !isTyping ? 'var(--accent-gradient)' : 'var(--line)', boxShadow: prompt.trim() && !isTyping ? '0 4px 16px rgba(201, 106, 58, 0.3)' : 'none' }}
                    aria-label="Send message"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Toast */}
      <div
        className={`fixed left-1/2 bottom-8 z-50 px-5 py-3 rounded-2xl text-xs font-semibold pointer-events-none transition-all duration-400 ${
          toast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
        }`}
        style={{
          transform: `translateX(-50%) ${toast ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)'}`,
          background: 'var(--text)',
          color: 'var(--bg)',
          boxShadow: 'var(--shadow-xl)'
        }}
        role="status"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          {toast}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-4xl h-[85vh] flex rounded-2xl overflow-hidden animate-scale-in" style={{ background: 'var(--panel)', boxShadow: 'var(--shadow-xl)' }}>
            {/* Sidebar */}
            <div className="w-56 flex-shrink-0 flex flex-col p-4" style={{ background: 'var(--bg-elevated)', borderRight: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2 mb-6 px-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Settings</span>
              </div>
              <nav className="flex flex-col gap-1">
                {[
                  { id: 'profile' as const, label: 'Profile', icon: '👤' },
                  { id: 'appearance' as const, label: 'Appearance', icon: '🎨' },
                  { id: 'chat' as const, label: 'Chat', icon: '💬' },
                  { id: 'data' as const, label: 'Data & Privacy', icon: '🔒' },
                  { id: 'about' as const, label: 'About', icon: 'ℹ️' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all"
                    style={{
                      background: settingsTab === tab.id ? 'var(--accent-glow)' : 'transparent',
                      color: settingsTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: settingsTab === tab.id ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (settingsTab !== tab.id) e.currentTarget.style.background = 'var(--line)'; }}
                    onMouseLeave={e => { if (settingsTab !== tab.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
              <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  Close
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto premium-scroll">
              <div className="p-8 max-w-2xl">
                {/* Profile Tab */}
                {settingsTab === 'profile' && (
                  <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Profile</h2>
                    <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Manage your account information</p>
                    
                    <div className="flex items-center gap-4 mb-8 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'var(--accent-gradient)' }}>
                        {settings.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--text)' }}>{settings.name}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{settings.email || 'No email set'}</div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Display Name</label>
                        <input
                          type="text"
                          value={settings.name}
                          onChange={e => setSettings({ ...settings, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm border-0 outline-none transition-all"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--line)' }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Email</label>
                        <input
                          type="email"
                          value={settings.email}
                          onChange={e => setSettings({ ...settings, email: e.target.value })}
                          placeholder="your@email.com"
                          className="w-full px-4 py-2.5 rounded-xl text-sm border-0 outline-none transition-all"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--line)' }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Bio</label>
                        <textarea
                          value={settings.bio}
                          onChange={e => setSettings({ ...settings, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl text-sm border-0 outline-none resize-none transition-all"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--line)' }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {settingsTab === 'appearance' && (
                  <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Appearance</h2>
                    <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Customize how Claude looks</p>

                    <div className="space-y-8">
                      <div>
                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Theme</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setDarkMode(false)}
                            className="p-4 rounded-xl text-left transition-all"
                            style={{
                              background: !darkMode ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                              border: !darkMode ? '2px solid var(--accent)' : '1px solid var(--line)',
                            }}
                          >
                            <div className="text-2xl mb-2">☀️</div>
                            <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>Light</div>
                          </button>
                          <button
                            onClick={() => setDarkMode(true)}
                            className="p-4 rounded-xl text-left transition-all"
                            style={{
                              background: darkMode ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                              border: darkMode ? '2px solid var(--accent)' : '1px solid var(--line)',
                            }}
                          >
                            <div className="text-2xl mb-2">🌙</div>
                            <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>Dark</div>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Font Size</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['small', 'medium', 'large'].map(size => (
                            <button
                              key={size}
                              onClick={() => setSettings({ ...settings, fontSize: size })}
                              className="py-3 rounded-xl text-sm font-medium transition-all capitalize"
                              style={{
                                background: settings.fontSize === size ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                                border: settings.fontSize === size ? '2px solid var(--accent)' : '1px solid var(--line)',
                                color: settings.fontSize === size ? 'var(--accent)' : 'var(--text-secondary)',
                              }}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Accent Color</label>
                        <div className="flex gap-3">
                          {[
                            { id: 'amber', color: '#c96a3a' },
                            { id: 'blue', color: '#3b82f6' },
                            { id: 'purple', color: '#8b5cf6' },
                            { id: 'green', color: '#10b981' },
                            { id: 'pink', color: '#ec4899' },
                          ].map(accent => (
                            <button
                              key={accent.id}
                              onClick={() => {
                                setSettings({ ...settings, accentColor: accent.id });
                                document.documentElement.style.setProperty('--accent', accent.color);
                              }}
                              className="w-10 h-10 rounded-full transition-all"
                              style={{
                                background: accent.color,
                                border: settings.accentColor === accent.id ? '3px solid var(--text)' : '2px solid transparent',
                                transform: settings.accentColor === accent.id ? 'scale(1.1)' : 'scale(1)',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Tab */}
                {settingsTab === 'chat' && (
                  <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Chat</h2>
                    <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Configure chat behavior</p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>Send on Enter</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Press Enter to send, Shift+Enter for new line</div>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, sendOnEnter: !settings.sendOnEnter })}
                          className="relative w-11 h-6 rounded-full transition-colors"
                          style={{ background: settings.sendOnEnter ? 'var(--accent)' : 'var(--line-strong)' }}
                        >
                          <div
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                            style={{ transform: settings.sendOnEnter ? 'translateX(22px)' : 'translateX(2px)' }}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>Show Timestamps</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Display time for each message</div>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, showTimestamps: !settings.showTimestamps })}
                          className="relative w-11 h-6 rounded-full transition-colors"
                          style={{ background: settings.showTimestamps ? 'var(--accent)' : 'var(--line-strong)' }}
                        >
                          <div
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                            style={{ transform: settings.showTimestamps ? 'translateX(22px)' : 'translateX(2px)' }}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>Streaming Responses</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Show responses as they're generated</div>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, streamingEnabled: !settings.streamingEnabled })}
                          className="relative w-11 h-6 rounded-full transition-colors"
                          style={{ background: settings.streamingEnabled ? 'var(--accent)' : 'var(--line-strong)' }}
                        >
                          <div
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                            style={{ transform: settings.streamingEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>Compact Mode</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Reduce spacing between messages</div>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, compactMode: !settings.compactMode })}
                          className="relative w-11 h-6 rounded-full transition-colors"
                          style={{ background: settings.compactMode ? 'var(--accent)' : 'var(--line-strong)' }}
                        >
                          <div
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                            style={{ transform: settings.compactMode ? 'translateX(22px)' : 'translateX(2px)' }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Tab */}
                {settingsTab === 'data' && (
                  <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Data & Privacy</h2>
                    <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Manage your data and privacy settings</p>

                    <div className="space-y-4">
                      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div className="font-medium text-sm mb-1" style={{ color: 'var(--text)' }}>Export All Data</div>
                        <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Download all your conversations as a JSON file</div>
                        <button
                          onClick={() => {
                            const data = JSON.stringify({ conversations: savedConversations, settings }, null, 2);
                            const blob = new Blob([data], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `claude-data-${Date.now()}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            showToast('Data exported');
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ background: 'var(--accent)', color: 'white' }}
                        >
                          Export Data
                        </button>
                      </div>

                      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div className="font-medium text-sm mb-1" style={{ color: 'var(--text)' }}>Clear All Conversations</div>
                        <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Permanently delete all chat history</div>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure? This cannot be undone.')) {
                              setSavedConversations([]);
                              resetChat();
                              showToast('All conversations cleared');
                            }
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ background: '#ef4444', color: 'white' }}
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div className="font-medium text-sm mb-1" style={{ color: 'var(--text)' }}>Reset Settings</div>
                        <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Restore all settings to default values</div>
                        <button
                          onClick={() => {
                            setSettings({
                              name: 'You',
                              email: '',
                              bio: '',
                              fontSize: 'medium',
                              sendOnEnter: true,
                              showTimestamps: true,
                              streamingEnabled: true,
                              compactMode: false,
                              accentColor: 'amber',
                            });
                            showToast('Settings reset');
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ background: 'var(--line-strong)', color: 'var(--text)' }}
                        >
                          Reset Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* About Tab */}
                {settingsTab === 'about' && (
                  <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>About</h2>
                    <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Information about Claude AI Assistant</p>

                    <div className="space-y-6">
                      <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl text-white animate-breathe" style={{ background: 'var(--accent-gradient)' }}>
                          ✦
                        </div>
                        <div className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Claude AI Assistant</div>
                        <div className="text-sm" style={{ color: 'var(--muted)' }}>Version 2.0.0</div>
                      </div>

                      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)' }}>
                        <div className="font-medium text-sm mb-3" style={{ color: 'var(--text)' }}>Keyboard Shortcuts</div>
                        <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex justify-between"><span>New chat</span><kbd className="px-2 py-0.5 rounded" style={{ background: 'var(--line)' }}>⌘K</kbd></div>
                          <div className="flex justify-between"><span>Focus input</span><kbd className="px-2 py-0.5 rounded" style={{ background: 'var(--line)' }}>⌘/</kbd></div>
                          <div className="flex justify-between"><span>Open settings</span><kbd className="px-2 py-0.5 rounded" style={{ background: 'var(--line)' }}>⌘,</kbd></div>
                          <div className="flex justify-between"><span>Close modal</span><kbd className="px-2 py-0.5 rounded" style={{ background: 'var(--line)' }}>Esc</kbd></div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl text-center text-xs" style={{ color: 'var(--muted)' }}>
                        Made with ❤️ using React & Tailwind CSS
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HTML Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-6xl h-[90vh] flex flex-col rounded-2xl overflow-hidden animate-scale-in" style={{ background: 'var(--panel)', boxShadow: 'var(--shadow-xl)' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--line)' }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{previewTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(previewHtml);
                      w.document.close();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Open in new tab
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([previewHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `preview-${Date.now()}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('Downloaded');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewHtml);
                    showToast('Copied');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  Copy
                </button>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--line)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            {/* Preview iframe */}
            <div className="flex-1 relative" style={{ background: 'white' }}>
              <iframe
                ref={previewIframeRef}
                srcDoc={previewHtml}
                className="absolute inset-0 w-full h-full border-0"
                title="HTML Preview"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        />
      )}
    </div>
  );
}
