
import React, { useState, useMemo } from 'react';
import type { SAC, Test } from '../types';
import Card from './Card';

interface BuildASacProps {
  allSacs: SAC[];
  allTests: Test[];
}

interface BuildResult {
    newSacCode: string;
    selectedTests: string[];
    explanation: string;
    similarSac: {
        sac: SAC;
        score: number;
    } | null;
}

const BuildASac: React.FC<BuildASacProps> = ({ allSacs, allTests }) => {
    const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<BuildResult | null>(null);

    const sortedTests = useMemo(() => [...allTests].sort((a, b) => a.name.localeCompare(b.name)), [allTests]);

    const filteredTests = useMemo(() => {
        if (!filter.trim()) return sortedTests;
        const lowercasedFilter = filter.toLowerCase();
        return sortedTests.filter(test => test.name.toLowerCase().includes(lowercasedFilter));
    }, [filter, sortedTests]);

    const handleTestToggle = (testName: string) => {
        setResult(null); // Clear previous results when selection changes
        setSelectedTests(prev => {
            const newSet = new Set(prev);
            if (newSet.has(testName)) {
                newSet.delete(testName);
            } else {
                newSet.add(testName);
            }
            return newSet;
        });
    };

    const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        if (union.size === 0) {
            return 1;
        }
        return intersection.size / union.size;
    };

    const handleBuildSac = () => {
        if (selectedTests.size === 0) return;
        
        setIsLoading(true);
        setResult(null);

        setTimeout(() => {
            const sacsWithScores = allSacs.map(sac => ({
                sac,
                score: jaccardSimilarity(selectedTests, new Set(sac.testIds)),
            })).sort((a, b) => b.score - a.score);

            const mostSimilar = sacsWithScores.length > 0 ? sacsWithScores[0] : null;

            const existingSacNumbers = new Set(allSacs.map(s => parseInt(s.code.replace(/\D/g, ''), 10)).filter(n => !isNaN(n)));
            let baseNumber = 900;
            if (mostSimilar) {
                const similarNum = parseInt(mostSimilar.sac.code.replace(/\D/g, ''), 10);
                if (!isNaN(similarNum)) {
                    baseNumber = similarNum;
                }
            }

            let newSacNumber = -1;
            if (!existingSacNumbers.has(baseNumber)) {
                newSacNumber = baseNumber;
            } else {
                let offset = 1;
                while (true) {
                    const candidateUp = baseNumber + offset;
                    if (!existingSacNumbers.has(candidateUp)) {
                        newSacNumber = candidateUp;
                        break;
                    }
                    const candidateDown = baseNumber - offset;
                    if (candidateDown > 0 && !existingSacNumbers.has(candidateDown)) {
                        newSacNumber = candidateDown;
                        break;
                    }
                    offset++;
                }
            }
            
            const newSacCode = `SAC${newSacNumber}`;
            const explanation = mostSimilar ? `This code was chosen for being numerically close to ${mostSimilar.sac.code}, which is the most similar existing package.` : `This code was chosen as no highly similar packages were found.`;

            setResult({
                newSacCode,
                selectedTests: Array.from(selectedTests).sort(),
                explanation,
                similarSac: (mostSimilar && mostSimilar.score >= 0.9) ? mostSimilar : null,
            });

            setIsLoading(false);
        }, 100);
    };

    const SimilarSacAlert = ({ similarSac }: { similarSac: NonNullable<BuildResult['similarSac']> }) => {
        const isIdentical = similarSac.score === 1;
        return (
            <div role="alert" className={`alert ${isIdentical ? 'alert-success' : 'alert-warning'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <h3 className="font-bold">{isIdentical ? 'Identical SAC Found!' : 'Highly Similar SAC Found!'}</h3>
                    <div className="text-sm">
                        Your selection is {isIdentical ? '100% identical' : `${(similarSac.score * 100).toFixed(0)}% similar`} to <strong>{similarSac.sac.code} - {similarSac.sac.name}</strong>. You should probably use this existing package instead.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="card-title">1. Select Tests</h3>
                    <div className="form-control w-full my-2">
                        <input
                            type="text"
                            placeholder="Filter tests..."
                            className="input input-bordered"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <div className="max-h-96 overflow-y-auto pr-2 -mr-2 space-y-2">
                        {filteredTests.map(test => (
                            <div key={test.id} className="form-control">
                                <label className="label cursor-pointer p-2 rounded-lg hover:bg-base-300/50 transition-colors">
                                    <span className="label-text">{test.name}</span>
                                    <input
                                        type="checkbox"
                                        checked={selectedTests.has(test.name)}
                                        onChange={() => handleTestToggle(test.name)}
                                        className="checkbox checkbox-primary"
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card>
                    <div className="flex flex-col justify-between h-full">
                        <div>
                           <h3 className="card-title">2. Build & Review</h3>
                           <p className="mt-2 mb-4 text-base-content/70">
                                Once you have selected all the tests you need, click the button below to generate a new SAC and check for duplicates.
                           </p>
                           <div className="badge badge-primary badge-outline">
                                {selectedTests.size} test{selectedTests.size !== 1 && 's'} selected
                           </div>
                        </div>
                        <div className="card-actions justify-end mt-4">
                           <button
                                onClick={handleBuildSac}
                                disabled={isLoading || selectedTests.size === 0}
                                className="btn btn-primary w-full"
                           >
                                {isLoading && <span className="loading loading-spinner"></span>}
                                {isLoading ? 'Analyzing...' : 'Build My SAC'}
                           </button>
                        </div>
                    </div>
                </Card>
            </div>
            {result && (
                <div className="space-y-4">
                    {result.similarSac && <SimilarSacAlert similarSac={result.similarSac} />}
                    <Card>
                        <h3 className="card-title text-primary">Your Custom SAC: {result.newSacCode}</h3>
                        <p className="mt-1 text-sm text-base-content/80">{result.explanation}</p>
                        <div className="divider my-2"></div>
                        <h4 className="font-semibold mb-2">Tests included ({result.selectedTests.length}):</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            {result.selectedTests.map(testName => (
                                <li key={testName}>{testName}</li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default BuildASac;
