import React, { useState, useEffect } from 'react';

const ThemeToggle: React.FC = () => {
  // Initialize state from localStorage or default to 'forest'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'forest');

  // Effect to update the data-theme attribute on <html> and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'forest' ? 'light' : 'forest'));
  };

  return (
    <label className="swap swap-rotate" title={`Switch to ${theme === 'forest' ? 'light' : 'dark'} mode`}>
      <input
        type="checkbox"
        onChange={toggleTheme}
        checked={theme === 'light'}
        aria-label="Theme toggle"
      />
      {/* sun icon */}
      <svg className="swap-on fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-1.41,1.41L1,16.29V12h2v3.71L5.64,17ZM5,12H3V7L5,5l1.41,1.41L5,7.83V12Zm9-7H11v2h2V5Zm2.36,2.36L15,6.41,16.41,5,19,7.59,17.59,9l-1.23-1.64ZM19,12h2v4h-2V12Zm-2.36,4.64L15,17.59,16.41,19,19,16.41,17.59,15l-1.23,1.64ZM12,19h2v2h-2v-2Zm-4.36-2.36L6.41,15,5,16.41,7.59,19,9,17.59,7.64,16.36Z"/></svg>
      {/* moon icon */}
      <svg className="swap-off fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22a10.14,10.14,0,0,0,9.5,9.5,8.14,8.14,0,0,1-5.22,2.97Z"/></svg>
    </label>
  );
};

export default ThemeToggle;
