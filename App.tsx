
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchBySac from './components/SearchBySac';
import SearchByTest from './components/SearchByTest';
import AIRecommender from './components/AIRecommender';
import BuildASac from './components/BuildASac';
import Settings from './components/Settings';
import { SearchIcon, FlaskIcon, SparklesIcon, SettingsIcon, BuildIcon } from './components/icons/Icons';
import { fetchData } from './services/pocketbaseService';
import type { View, SAC, Test } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('ai');
  const [tests, setTests] = useState<Test[]>([]);
  const [sacs, setSacs] = useState<SAC[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { tests, sacs } = await fetchData();
        setTests(tests);
        setSacs(sacs);
      } catch (err) {
        setError('Failed to load data from the server. Please check your connection and try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);


  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="ml-4 text-lg">Loading test data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div role="alert" className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      );
    }
    
    switch (activeView) {
      case 'sac':
        return <SearchBySac allSacs={sacs} />;
      case 'test':
        return <SearchByTest allSacs={sacs} />;
      case 'ai':
        return <AIRecommender allSacs={sacs} allTests={tests} />;
      case 'build':
        return <BuildASac allSacs={sacs} allTests={tests} />;
      case 'settings':
        return <Settings allSacs={sacs} />;
      default:
        return <AIRecommender allSacs={sacs} allTests={tests} />;
    }
  };

  const Tab = ({
    label,
    view,
    icon,
  }: {
    label: string;
    view: View;
    icon: React.ReactNode;
  }) => (
    <a
      role="tab"
      className={`tab tab-lg flex-1 gap-2 ${activeView === view ? 'tab-active font-bold' : ''}`}
      onClick={() => setActiveView(view)}
    >
      {icon}
      {label}
    </a>
  );

  return (
    <div className="min-h-screen bg-base-100 text-base-content font-sans">
      <Header />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-base-200/50 backdrop-blur-sm rounded-box shadow-2xl overflow-hidden border border-base-300">
          <div className="p-6 border-b border-base-300">
            <h2 className="text-xl font-bold text-base-content">SAC & Test Lookup</h2>
            <p className="text-base-content/70 mt-1">
              Find the right SAC for your needs using live data.
            </p>
          </div>

          <div role="tablist" className="tabs tabs-boxed grid grid-cols-2 md:grid-cols-5 p-2 bg-base-300/50">
             <Tab label="AI Recommender" view="ai" icon={<SparklesIcon />} />
             <Tab label="Search by SAC" view="sac" icon={<SearchIcon />} />
             <Tab label="Search by Test" view="test" icon={<FlaskIcon />} />
             <Tab label="Build-A-SAC" view="build" icon={<BuildIcon />} />
             <Tab label="Settings" view="settings" icon={<SettingsIcon />} />
          </div>

          <div className="p-6">
            {renderView()}
          </div>
        </div>
        <footer className="footer footer-center p-4 text-base-content/50 mt-8">
          <aside>
            <p>DEP SAC & Test Lookup</p>
            <p>This is a demonstration app. Data is sourced live from a PocketBase backend.</p>
          </aside>
        </footer>
      </main>
    </div>
  );
};

export default App;