
export interface Test {
  id: string;
  name: string;
}

export interface SAC {
  code: string;
  name: string;
  description: string;
  bottleware?: string;
  testIds: string[];
}

export type View = 'sac' | 'test' | 'ai' | 'settings' | 'build';

export interface AIRecommendation {
  recommendedSac: {
    code: string;
    name: string;
    reasoning: string;
  };
  additionalTests: {
    id: string;
    name: string;
    reasoning: string;
  }[];
  overallExplanation: string;
}

export interface RawTestRecord {
  recordId: string;
  testId: string;
  name: string;
}
