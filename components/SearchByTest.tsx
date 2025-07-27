
import React, { useState } from 'react';
import type { SAC } from '../types';
import Card from './Card';

interface SearchByTestProps {
  allSacs: SAC[];
}

interface RankedSac {
  sac: SAC;
  score: number;
  matchedTests: string[];
  totalTerms: number;
}

const SearchByTest: React.FC<SearchByTestProps> = ({ allSacs }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RankedSac[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    const searchTerms = query.toLowerCase().split(',')
      .map(term => term.trim())
      .filter(Boolean);

    if (searchTerms.length === 0) {
      setResults([]);
      setHasSearched(true);
      return;
    }
    
    const scoredSacs = allSacs.map(sac => {
      let score = 0;
      const matchedTestsInSac = new Set<string>();

      searchTerms.forEach(term => {
        let termFound = false;
        sac.testIds.forEach(testName => {
          if (testName.toLowerCase().includes(term)) {
            termFound = true;
            matchedTestsInSac.add(testName);
          }
        });
        if (termFound) {
          score++;
        }
      });
      
      return {
        sac,
        score,
        matchedTests: Array.from(matchedTestsInSac).sort(),
        totalTerms: searchTerms.length
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    setResults(scoredSacs);
    setHasSearched(true);
  };

  const topResultsCount = results.length;

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="test-search" className="label">
          <span className="label-text">Enter tests you're interested in, separated by commas.</span>
        </label>
        <textarea
          id="test-search"
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="textarea textarea-bordered w-full"
          placeholder="e.g., lead, copper, bacteria, nitrate"
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="btn btn-outline btn-primary mt-3 w-full sm:w-auto"
        >
          Find Matching SACs
        </button>
      </div>

      {hasSearched && (
        <div>
           <h3 className="text-lg font-semibold mb-2">
            {topResultsCount > 0 ? `Top ${topResultsCount} Matching SACs` : "Matching SACs"}
          </h3>
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map(({ sac, score, matchedTests, totalTerms }) => (
                <Card key={sac.code}>
                  <div className="flex justify-between items-start">
                    <h4 className="card-title text-primary">{sac.code} - {sac.name}</h4>
                    <div className="badge badge-accent badge-outline font-bold">
                      Matches {score} of {totalTerms}
                    </div>
                  </div>
                  <p className="text-sm mt-1 mb-4">{sac.description}</p>
                   {matchedTests.length > 0 && (
                    <>
                      <h5 className="font-semibold text-sm">Matched Tests in this Package:</h5>
                      <ul className="list-disc list-inside text-sm text-base-content/80">
                        {matchedTests.map(testName => <li key={testName}>{testName}</li>)}
                      </ul>
                    </>
                   )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>No SACs found matching the specified tests.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchByTest;