
import React, { useState } from 'react';
import type { SAC } from '../types';
import Card from './Card';

interface SearchBySacProps {
  allSacs: SAC[];
}

const SearchBySac: React.FC<SearchBySacProps> = ({ allSacs }) => {
  const [query, setQuery] = useState('');
  const [selectedSac, setSelectedSac] = useState<SAC | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    const normalizedQuery = query.toLowerCase().replace(/^sac/i, '').trim();
    const foundSac = allSacs.find(sac => 
      sac.code.toLowerCase().replace(/^sac/i, '').trim() === normalizedQuery
    );
    setSelectedSac(foundSac || null);
    setSearched(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="sac-search" className="label">
          <span className="label-text">Enter Standard Access Code (SAC)</span>
        </label>
        <div className="join w-full">
          <input
            id="sac-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., 612 or SAC612"
            className="input input-bordered join-item w-full"
          />
          <button
            onClick={handleSearch}
            className="btn btn-outline btn-primary join-item"
          >
            Search
          </button>
        </div>
      </div>

      {searched && (
        selectedSac ? (
          <Card>
            <h3 className="card-title text-primary">{selectedSac.code} - {selectedSac.name}</h3>
            <p className="mt-1 mb-4">{selectedSac.description}</p>
            
            {selectedSac.bottleware && (
              <>
                <h4 className="font-semibold mb-2">Bottleware & Preservatives</h4>
                <p className="text-sm text-base-content/80">{selectedSac.bottleware}</p>
                <div className="divider my-2"></div>
              </>
            )}
            
            <h4 className="font-semibold mb-2">Tests included:</h4>
            <ul className="list-disc list-inside space-y-1">
              {selectedSac.testIds.map(testName => (
                <li key={testName}>{testName}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>No SAC found for "{query}". Please check the code and try again.</span>
          </div>
        )
      )}
    </div>
  );
};

export default SearchBySac;