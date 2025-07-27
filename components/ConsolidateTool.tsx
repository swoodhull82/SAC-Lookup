
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getRawTests } from '../services/pocketbaseService';
import { consolidateTests, LogCallback } from '../services/uploadService';
import Card from './Card';
import type { RawTestRecord } from '../types';

interface ConsolidateToolProps {
  uploaderEmail: string;
  uploaderPassword: string;
}

const ConsolidateTool: React.FC<ConsolidateToolProps> = ({ uploaderEmail, uploaderPassword }) => {
  const [allRawTests, setAllRawTests] = useState<RawTestRecord[]>([]);
  const [oldTestId, setOldTestId] = useState('');
  const [newTestId, setNewTestId] = useState('');
  const [oldTestFilter, setOldTestFilter] = useState('');
  const [newTestFilter, setNewTestFilter] = useState('');
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTests() {
      try {
        const rawTests = await getRawTests();
        setAllRawTests(rawTests);
      } catch (err) {
        console.error("Failed to load raw tests for consolidation tool", err);
        setError("Could not load the list of tests for the dropdowns.");
      }
    }
    loadTests();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const filterTests = (tests: RawTestRecord[], filter: string) => {
    if (!filter.trim()) {
        return tests;
    }
    const lowercasedFilter = filter.toLowerCase();
    return tests.filter(test => 
        test.name.toLowerCase().includes(lowercasedFilter) ||
        test.testId.toLowerCase().includes(lowercasedFilter)
    );
  };

  const filteredOldTests = useMemo(() => filterTests(allRawTests, oldTestFilter), [allRawTests, oldTestFilter]);
  const filteredNewTests = useMemo(() => filterTests(allRawTests, newTestFilter), [allRawTests, newTestFilter]);

  // Clear selection if it's filtered out
  useEffect(() => {
    if (oldTestId && !filteredOldTests.some(t => t.recordId === oldTestId)) {
        setOldTestId('');
    }
  }, [oldTestId, filteredOldTests]);

  useEffect(() => {
    if (newTestId && !filteredNewTests.some(t => t.recordId === newTestId)) {
        setNewTestId('');
    }
  }, [newTestId, filteredNewTests]);


  const handleConsolidate = async () => {
    if (!oldTestId || !newTestId) {
      setError("Please select both a test to remove and a test to keep.");
      return;
    }
    if (oldTestId === newTestId) {
        setError("The test to remove and the test to keep cannot be the same.");
        return;
    }

    setIsConsolidating(true);
    setError(null);
    setLogs([]);

    const logCallback: LogCallback = (message) => {
      setLogs(prev => [...prev, message]);
    };

    try {
      await consolidateTests(oldTestId, newTestId, uploaderEmail, uploaderPassword, logCallback);
    } catch (err: any) {
       setError(err.message || "An unknown error occurred during consolidation.");
    } finally {
      setIsConsolidating(false);
    }
  };
  
  const renderTestOption = (test: RawTestRecord) => (
    <option key={test.recordId} value={test.recordId}>
        {test.name} ({test.testId})
    </option>
  );

  return (
    <Card>
      <h3 className="card-title">Consolidate Duplicate Tests</h3>
      <p className="mt-1 mb-4 text-base-content/70">
        This utility helps merge duplicate test entries. It will find all SACs containing the "Old Test" and replace it with the "New Test". After running, you can safely delete the old test from the PocketBase admin UI.
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="label">
                    <span className="label-text">1. Test to Remove (Old)</span>
                </label>
                <input
                    type="text"
                    placeholder="Filter by name or test_id..."
                    className="input input-bordered w-full mb-2"
                    value={oldTestFilter}
                    onChange={(e) => setOldTestFilter(e.target.value)}
                    disabled={allRawTests.length === 0 || isConsolidating}
                />
                <select 
                    className="select select-bordered w-full"
                    value={oldTestId}
                    onChange={(e) => setOldTestId(e.target.value)}
                    disabled={allRawTests.length === 0 || isConsolidating}
                >
                    <option value="" disabled>Select a test...</option>
                    {filteredOldTests.map(renderTestOption)}
                </select>
            </div>
            <div>
                <label className="label">
                    <span className="label-text">2. Test to Keep (New)</span>
                </label>
                <input
                    type="text"
                    placeholder="Filter by name or test_id..."
                    className="input input-bordered w-full mb-2"
                    value={newTestFilter}
                    onChange={(e) => setNewTestFilter(e.target.value)}
                    disabled={allRawTests.length === 0 || isConsolidating}
                />
                 <select 
                    className="select select-bordered w-full"
                    value={newTestId}
                    onChange={(e) => setNewTestId(e.target.value)}
                    disabled={allRawTests.length === 0 || isConsolidating}
                >
                    <option value="" disabled>Select a test...</option>
                    {filteredNewTests.map(renderTestOption)}
                </select>
            </div>
        </div>
        <div className="card-actions justify-end">
            <button
                onClick={handleConsolidate}
                disabled={isConsolidating || !oldTestId || !newTestId || (oldTestId === newTestId)}
                className={`btn btn-secondary ${isConsolidating ? 'btn-disabled' : ''}`}
            >
              {isConsolidating && <span className="loading loading-spinner"></span>}
              {isConsolidating ? 'Consolidating...' : 'Start Consolidation'}
            </button>
        </div>
      </div>
      
      {error && !isConsolidating && (
        <div role="alert" className="alert alert-error mt-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      {logs.length > 0 && (
         <div className="mt-4">
            <h4 className="font-bold">Consolidation Log</h4>
            <pre className="mt-2 p-4 bg-base-300 rounded-box text-sm whitespace-pre-wrap overflow-x-auto h-64">
              {logs.join('\n')}
              <div ref={logsEndRef} />
            </pre>
         </div>
      )}
    </Card>
  );
};

export default ConsolidateTool;
