import React from 'react';
import { WaterDropIcon } from './icons/Icons';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  return (
    <header className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <WaterDropIcon className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-base-content tracking-tight">
              DEP SAC & Test Lookup
            </h1>
            <p className="text-sm text-base-content/70">Bureau of Laboratories</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;