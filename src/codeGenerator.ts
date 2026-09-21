// Dynamic Code Generation Engine
// Analyzes user input and generates unique code based on context

export function generateDynamicResponse(userInput: string, modelType?: string): string {
  const lower = userInput.toLowerCase().trim();
  
  // Extract key concepts from user input
  const concepts = extractConcepts(userInput);
  
  // Determine what type of code to generate
  const codeType = determineCodeType(concepts, lower);
  
  // Generate the code dynamically
  const generatedCode = generateCode(codeType, concepts, userInput);
  
  return generatedCode;
}

function extractConcepts(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const concepts: string[] = [];
  
  // UI Components
  const uiKeywords = ['button', 'form', 'input', 'modal', 'card', 'navbar', 'menu', 'sidebar', 'header', 'footer', 'component', 'widget', 'element', 'dialog', 'popup', 'dropdown', 'tabs', 'accordion'];
  
  // Layout
  const layoutKeywords = ['layout', 'grid', 'flex', 'responsive', 'mobile', 'desktop', 'design', 'container', 'section', 'page'];
  
  // Functionality
  const funcKeywords = ['animation', 'animate', 'transition', 'effect', 'motion', 'fade', 'slide', 'rotate', 'hover', 'click', 'scroll', 'parallax'];
  
  // Data
  const dataKeywords = ['list', 'table', 'items', 'data', 'display', 'show', 'render', 'chart', 'graph', 'stats'];
  
  // Forms
  const formKeywords = ['form', 'signup', 'login', 'register', 'contact', 'submit', 'input', 'field', 'validation'];
  
  // Navigation
  const navKeywords = ['nav', 'navigation', 'menu', 'navbar', 'header', 'sidebar', 'breadcrumb'];
  
  // API/Backend
  const apiKeywords = ['api', 'fetch', 'request', 'endpoint', 'data', 'json', 'database', 'backend', 'server'];
  
  // Check which categories match
  if (uiKeywords.some(k => words.includes(k))) concepts.push('ui-component');
  if (layoutKeywords.some(k => words.includes(k))) concepts.push('layout');
  if (funcKeywords.some(k => words.includes(k))) concepts.push('animation');
  if (dataKeywords.some(k => words.includes(k))) concepts.push('data-display');
  if (formKeywords.some(k => words.includes(k))) concepts.push('form');
  if (navKeywords.some(k => words.includes(k))) concepts.push('navigation');
  if (apiKeywords.some(k => words.includes(k))) concepts.push('api');
  
  // Extract specific component names
  const specificComponents = words.filter(w => 
    [...uiKeywords, ...layoutKeywords, ...funcKeywords].includes(w)
  );
  
  if (specificComponents.length > 0) {
    concepts.push(...specificComponents);
  }
  
  return [...new Set(concepts)]; // Remove duplicates
}

function determineCodeType(concepts: string[], lower: string): string {
  if (concepts.includes('form') || lower.includes('form')) return 'form';
  if (concepts.includes('navigation') || lower.includes('nav')) return 'navigation';
  if (concepts.includes('animation') || lower.includes('animate')) return 'animation';
  if (concepts.includes('layout') || lower.includes('grid')) return 'layout';
  if (concepts.includes('data-display') || lower.includes('list')) return 'data-display';
  if (concepts.includes('api') || lower.includes('fetch')) return 'api';
  if (concepts.includes('ui-component')) return 'component';
  
  // Default to generic component
  return 'component';
}

function generateCode(type: string, concepts: string[], originalText: string): string {
  const title = extractTitle(originalText);
  const colors = generateColorScheme();
  
  switch (type) {
    case 'form':
      return generateForm(title, colors);
    case 'navigation':
      return generateNavigation(title, colors);
    case 'animation':
      return generateAnimation(title, colors);
    case 'layout':
      return generateLayout(title, colors);
    case 'data-display':
      return generateDataDisplay(title, colors);
    case 'api':
      return generateAPI(title, colors);
    case 'component':
    default:
      return generateComponent(title, colors, concepts);
  }
}

function extractTitle(text: string): string {
  // Extract meaningful words for title
  const words = text.split(/\s+/).filter(w => w.length > 3);
  return words.slice(0, 3).join(' ') || 'Generated Component';
}

function generateColorScheme(): { primary: string; secondary: string; accent: string } {
  const schemes = [
    { primary: '#667eea', secondary: '#764ba2', accent: '#f093fb' },
    { primary: '#f093fb', secondary: '#f5576c', accent: '#4facfe' },
    { primary: '#4facfe', secondary: '#00f2fe', accent: '#43e97b' },
    { primary: '#fa709a', secondary: '#fee140', accent: '#30cfd0' },
    { primary: '#a8edea', secondary: '#fed6e3', accent: '#ff9a9e' },
  ];
  return schemes[Math.floor(Math.random() * schemes.length)];
}

function generateForm(title: string, colors: any): string {
  return `I'll create a modern form for you!

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .form-container {
      background: white;
      border-radius: 20px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 450px;
      width: 100%;
    }
    .form-container h2 {
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
    }
    .form-container p {
      color: #666;
      margin-bottom: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #333;
      margin-bottom: 0.5rem;
    }
    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e5e5e5;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.2s;
      font-family: inherit;
    }
    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 3px ${colors.primary}20;
    }
    .submit-btn {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px ${colors.primary}40;
    }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>${title}</h2>
    <p>Fill out the form below</p>
    <form onsubmit="event.preventDefault(); alert('Form submitted!');">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" placeholder="Your name" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="your@email.com" required>
      </div>
      <div class="form-group">
        <label for="message">Message</label>
        <textarea id="message" name="message" placeholder="Your message..." rows="4" required></textarea>
      </div>
      <button type="submit" class="submit-btn">Submit</button>
    </form>
  </div>
</body>
</html>
\`\`\`

Click **Preview** to see it live!`;
}

function generateNavigation(title: string, colors: any): string {
  return `Here's a responsive navigation component:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
    }
    .navbar {
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-logo {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .nav-menu {
      display: flex;
      gap: 2rem;
      list-style: none;
    }
    .nav-menu a {
      text-decoration: none;
      color: #333;
      font-weight: 500;
      transition: color 0.2s;
      position: relative;
    }
    .nav-menu a:hover {
      color: ${colors.primary};
    }
    .nav-menu a::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background: ${colors.primary};
      transition: width 0.3s;
    }
    .nav-menu a:hover::after {
      width: 100%;
    }
    .nav-cta {
      padding: 0.625rem 1.5rem;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .nav-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px ${colors.primary}40;
    }
    @media (max-width: 768px) {
      .nav-menu {
        display: none;
      }
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-logo">Brand</div>
      <ul class="nav-menu">
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#services">Services</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
      <a href="#start" class="nav-cta">Get Started</a>
    </div>
  </nav>
</body>
</html>
\`\`\`

This navbar is sticky and responsive!`;
}

function generateAnimation(title: string, colors: any): string {
  return `Here's an animation system with multiple effects:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f0f0e;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .box {
      width: 100px;
      height: 100px;
      border-radius: 16px;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .box:hover {
      transform: translateY(-10px) scale(1.1);
      box-shadow: 0 20px 40px ${colors.primary}40;
    }
    .fade { animation: fadeIn 1s ease-in-out infinite alternate; }
    .slide { animation: slideIn 1s ease-in-out infinite alternate; }
    .rotate { animation: rotate360 2s linear infinite; }
    .pulse { animation: pulse 1.5s ease-in-out infinite; }
    
    @keyframes fadeIn {
      from { opacity: 0.3; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(-20px); }
      to { transform: translateX(20px); }
    }
    @keyframes rotate360 {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="box fade"></div>
    <div class="box slide"></div>
    <div class="box rotate"></div>
    <div class="box pulse"></div>
  </div>
</body>
</html>
\`\`\`

Includes fade, slide, rotate, and pulse animations!`;
}

function generateLayout(title: string, colors: any): string {
  return `Here's a responsive layout system:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    .card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
    }
    .card p {
      color: #666;
      line-height: 1.6;
    }
    @media (max-width: 768px) {
      body { padding: 1rem; }
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="grid">
      <div class="card">
        <h3>Responsive Grid</h3>
        <p>Automatically adjusts columns based on screen size.</p>
      </div>
      <div class="card">
        <h3>Mobile First</h3>
        <p>Designed to work perfectly on all devices.</p>
      </div>
      <div class="card">
        <h3>Modern CSS</h3>
        <p>Using Grid and Flexbox for powerful layouts.</p>
      </div>
    </div>
  </div>
</body>
</html>
\`\`\`

Fully responsive and works on all screen sizes!`;
}

function generateDataDisplay(title: string, colors: any): string {
  return `Here's a dynamic data display component:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .header h1 {
      font-size: 2rem;
      color: #1a1a1a;
    }
    .list {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .list-item {
      padding: 1.5rem;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    .list-item:hover {
      background: #fafafa;
    }
    .list-item:last-child {
      border-bottom: none;
    }
    .item-content h3 {
      font-size: 1.125rem;
      color: #1a1a1a;
      margin-bottom: 0.25rem;
    }
    .item-content p {
      color: #666;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="list">
      <div class="list-item">
        <div class="item-content">
          <h3>Item One</h3>
          <p>Description of the first item</p>
        </div>
      </div>
      <div class="list-item">
        <div class="item-content">
          <h3>Item Two</h3>
          <p>Description of the second item</p>
        </div>
      </div>
      <div class="list-item">
        <div class="item-content">
          <h3>Item Three</h3>
          <p>Description of the third item</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
\`\`\`

Clean and modern data display!`;
}

function generateAPI(title: string, colors: any): string {
  return `Here's a modern API client implementation:

\`\`\`javascript
// API Client with error handling
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  async request(endpoint, options = {}) {
    const url = \`\${this.baseURL}\${endpoint}\`;
    const config = {
      headers: this.headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Usage
const api = new ApiClient('https://api.example.com');
const data = await api.get('/users');
\`\`\`

Complete API client with all HTTP methods!`;
}

function generateComponent(title: string, colors: any, concepts: string[]): string {
  const componentName = concepts.find(c => !['ui-component', 'layout', 'animation', 'data-display', 'form', 'navigation', 'api'].includes(c)) || 'Component';
  
  return `I'll create that for you!

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .component {
      background: white;
      border-radius: 20px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .component h2 {
      font-size: 1.75rem;
      margin-bottom: 1rem;
      color: #1a1a1a;
    }
    .component p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-block;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      transition: all 0.3s;
      border: none;
      cursor: pointer;
    }
    .btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px ${colors.primary}40;
    }
  </style>
</head>
<body>
  <div class="component">
    <h2>${title}</h2>
    <p>A modern, responsive component ready for your project.</p>
    <button class="btn">Get Started</button>
  </div>
</body>
</html>
\`\`\`

Click **Preview** to see it live, **Download** to save it, or **Copy** the code!`;
}
