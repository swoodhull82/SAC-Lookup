
import React, { useState } from 'react';
import type { SAC } from '../types';
import Card from './Card';

interface DuplicateSacFinderProps {
  allSacs: SAC[];
}

interface SimilarityResult {
  sac1: SAC;
  sac2: SAC;
  score: number;
}

// A small component to display the detailed information for a single SAC.
const SacDetailCard = ({ sac }: { sac: SAC }) => (
  <div className="p-4 bg-base-100 rounded-lg my-2">
    <h5 className="font-bold text-primary">{sac.code} - {sac.name}</h5>
    <p className="text-sm text-base-content/80 mt-1 mb-2">{sac.description}</p>
    
    {sac.bottleware && (
      <>
        <h6 className="font-semibold text-xs uppercase tracking-wider text-base-content/60">Bottleware & Preservatives</h6>
        <p className="text-sm text-base-content/80">{sac.bottleware}</p>
        <div className="divider my-2"></div>
      </>
    )}

    <h6 className="font-semibold text-xs uppercase tracking-wider text-base-content/60">
      Tests Included ({sac.testIds.length})
    </h6>
    <ul className="list-disc list-inside text-sm text-base-content/80 mt-1">
      {sac.testIds.map(testName => <li key={testName}>{testName}</li>)}
    </ul>
  </div>
);


const DuplicateSacFinder: React.FC<DuplicateSacFinderProps> = ({ allSacs }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [identicalGroups, setIdenticalGroups] = useState<SAC[][]>([]);
  const [ninetyPercentSimilar, setNinetyPercentSimilar] = useState<SimilarityResult[]>([]);
  const [eightyPercentSimilar, setEightyPercentSimilar] = useState<SimilarityResult[]>([]);

  const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    if (union.size === 0) {
      return 1; // Two empty sets are 100% similar
    }
    return intersection.size / union.size;
  };

  const handleAnalyze = () => {
    setIsLoading(true);
    setHasAnalyzed(false);

    // Use a timeout to allow the UI to update to the loading state
    setTimeout(() => {
        const identicalMap = new Map<string, SAC[]>();
        const ninety: SimilarityResult[] = [];
        const eighty: SimilarityResult[] = [];
        
        const sacsWithTestSets = allSacs.map(sac => ({
            ...sac,
            testIdSet: new Set(sac.testIds)
        }));

        // --- Group 100% identical SACs ---
        sacsWithTestSets.forEach(sac => {
            const key = [...sac.testIdSet].sort().join(',');
            if (!identicalMap.has(key)) {
                identicalMap.set(key, []);
            }
            identicalMap.get(key)!.push(sac);
        });
        const identical = Array.from(identicalMap.values()).filter(group => group.length > 1);
        setIdenticalGroups(identical);

        // --- Find similar SACs (non-identical ones) ---
        for (let i = 0; i < sacsWithTestSets.length; i++) {
            for (let j = i + 1; j < sacsWithTestSets.length; j++) {
                const sac1 = sacsWithTestSets[i];
                const sac2 = sacsWithTestSets[j];
                const score = jaccardSimilarity(sac1.testIdSet, sac2.testIdSet);

                if (score < 1) { // Only consider non-identical pairs
                    if (score >= 0.9) {
                        ninety.push({ sac1, sac2, score });
                    } else if (score >= 0.8) {
                        eighty.push({ sac1, sac2, score });
                    }
                }
            }
        }
        setNinetyPercentSimilar(ninety.sort((a,b) => b.score - a.score));
        setEightyPercentSimilar(eighty.sort((a,b) => b.score - a.score));

        setIsLoading(false);
        setHasAnalyzed(true);
    }, 50); // Small delay to ensure loading spinner shows
  };

  const ResultSection = ({ title, children, count }: { title: string, children: React.ReactNode, count: number }) => (
     <Card>
        <h4 className="card-title">{title}</h4>
        {count > 0 ? (
            <div className="space-y-3 mt-2">{children}</div>
        ) : (
            <p className="text-base-content/70 mt-2">No SACs found in this category.</p>
        )}
     </Card>
  );

  return (
    <Card>
      <h3 className="card-title">Find Duplicate & Similar SACs</h3>
      <p className="mt-1 mb-4 text-base-content/70">
        Analyze all SACs to find packages with identical or highly similar test lists. This helps identify redundant data.
      </p>
      <div className="card-actions justify-end">
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className={`btn btn-accent ${isLoading ? 'btn-disabled' : ''}`}
        >
          {isLoading && <span className="loading loading-spinner"></span>}
          {isLoading ? 'Analyzing...' : 'Start Analysis'}
        </button>
      </div>

      {hasAnalyzed && !isLoading && (
        <div className="space-y-6 mt-6">
            <ResultSection title="100% Identical SACs" count={identicalGroups.length}>
                {identicalGroups.map((group, index) => (
                    <details key={index} className="collapse collapse-arrow bg-base-300">
                      <summary className="collapse-title font-semibold">
                        Group {index + 1}: ({group.map(s => s.code).join(', ')})
                      </summary>
                      <div className="collapse-content">
                        {group.map(sac => <SacDetailCard key={sac.code} sac={sac} />)}
                      </div>
                    </details>
                ))}
            </ResultSection>

             <ResultSection title="90% - 99% Similar SACs" count={ninetyPercentSimilar.length}>
                {ninetyPercentSimilar.map(({ sac1, sac2, score }, index) => (
                    <details key={index} className="collapse collapse-arrow bg-base-300">
                        <summary className="collapse-title font-semibold text-sm">
                            {sac1.code} & {sac2.code}
                            <span className="badge badge-outline badge-success ml-2">{(score * 100).toFixed(1)}%</span>
                        </summary>
                        <div className="collapse-content">
                            <SacDetailCard sac={sac1} />
                            <div className="divider my-1">and</div>
                            <SacDetailCard sac={sac2} />
                        </div>
                    </details>
                ))}
            </ResultSection>
            
            <ResultSection title="80% - 89% Similar SACs" count={eightyPercentSimilar.length}>
                {eightyPercentSimilar.map(({ sac1, sac2, score }, index) => (
                    <details key={index} className="collapse collapse-arrow bg-base-300">
                        <summary className="collapse-title font-semibold text-sm">
                            {sac1.code} & {sac2.code}
                            <span className="badge badge-outline badge-warning ml-2">{(score * 100).toFixed(1)}%</span>
                        </summary>
                        <div className="collapse-content">
                            <SacDetailCard sac={sac1} />
                            <div className="divider my-1">and</div>
                            <SacDetailCard sac={sac2} />
                        </div>
                    </details>
                ))}
            </ResultSection>
        </div>
      )}
    </Card>
  );
};

export default DuplicateSacFinder;
