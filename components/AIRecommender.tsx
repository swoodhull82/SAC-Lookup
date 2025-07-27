import React, { useState } from 'react';
import Card from './Card';
import { getRecommendation } from '../services/geminiService';
import type { AIRecommendation, SAC, Test } from '../types';

interface AIRecommenderProps {
  allSacs: SAC[];
  allTests: Test[];
}

const AIRecommender: React.FC<AIRecommenderProps> = ({ allSacs, allTests }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIRecommendation | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('Please describe your testing needs.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const recommendation = await getRecommendation(prompt, allSacs, allTests);
      setResult(recommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="form-control">
        <label htmlFor="ai-prompt" className="label">
          <span className="label-text">Describe your concerns or situation (water, soil, etc.)</span>
        </label>
        <textarea
          id="ai-prompt"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="textarea textarea-bordered h-24"
          placeholder="e.g., 'My house was built in the 1970s and is near an old gas station. The water sometimes tastes metallic.' or 'I need to test soil from a construction site for contaminants.'"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`btn btn-outline btn-primary mt-3 ${isLoading ? 'btn-disabled' : ''}`}
        >
          {isLoading && <span className="loading loading-spinner"></span>}
          {isLoading ? 'Analyzing...' : 'Get AI Recommendation'}
        </button>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <h3 className="card-title">AI Recommendation</h3>
            <p className="mt-2">{result.overallExplanation}</p>
          </Card>

          <Card>
            <h4 className="card-title text-primary">{result.recommendedSac.code} - {result.recommendedSac.name}</h4>
            <p className="mt-2">
              <span className="font-semibold">Reasoning:</span> {result.recommendedSac.reasoning}
            </p>
          </Card>
          
          {result.additionalTests.length > 0 && (
            <Card>
              <h4 className="card-title text-accent">Recommended Additional Tests</h4>
              <ul className="space-y-3 mt-2">
                {result.additionalTests.map((test) => (
                  <li key={test.id}>
                    <p className="font-bold">{test.name}</p>
                    <p>
                      <span className="font-semibold">Reasoning:</span> {test.reasoning}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AIRecommender;