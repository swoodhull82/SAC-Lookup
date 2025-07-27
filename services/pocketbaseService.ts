
import PocketBase from 'pocketbase';
import type { SAC, Test, RawTestRecord } from '../types';

const pb = new PocketBase('https://dep-sac-lookup.pockethost.io/');

// PocketBase record types (to help with typing)
interface TestRecord {
  id: string; // PocketBase's own ID
  collectionId: string;
  collectionName: string;
  test_id: string; // My custom field T01, T02 etc.
  name: string;
}

interface SacRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  sac_code: string; // My custom field SAC101 etc.
  name: string;
  description: string;
  bottleware?: string;
  expand?: {
    tests: TestRecord[];
  };
  tests: string[]; // This will be an array of TestRecord IDs
}

// Combine fetches into a single function for the app to call
export async function fetchData(): Promise<{ tests: Test[], sacs: SAC[] }> {
  // Use Promise.all to fetch in parallel for efficiency
  const [testRecords, sacRecords] = await Promise.all([
    pb.collection('tests').getFullList<TestRecord>({ sort: 'name' }),
    pb.collection('sacs').getFullList<SacRecord>({ sort: 'sac_code', expand: 'tests' }),
  ]);

  // 1. Create a de-duplicated list of tests based on name
  const uniqueTestsMap = new Map<string, Test>();
  for (const record of testRecords) {
    if (!uniqueTestsMap.has(record.name)) {
      uniqueTestsMap.set(record.name, {
        id: record.name, // Use the name as the unique ID in the app
        name: record.name,
      });
    }
  }
  const tests = Array.from(uniqueTestsMap.values());

  // 2. Process SACs to use the consolidated test names as their 'testIds'
  const sacs = sacRecords.map(record => {
    // Use a Set to automatically handle duplicates if a SAC links to two tests with the same name
    const testNames = new Set<string>(record.expand?.tests?.map(test => test.name) || []);
    
    return {
      code: record.sac_code,
      name: record.name,
      description: record.description,
      bottleware: record.bottleware,
      testIds: Array.from(testNames).sort(), // Store a sorted array of unique test names
    };
  });

  return { tests, sacs };
}

// Fetches the raw, unprocessed list of tests for admin tools
export async function getRawTests(): Promise<RawTestRecord[]> {
  const records = await pb.collection('tests').getFullList<TestRecord>({
    sort: 'name',
    fields: 'id,test_id,name',
  });

  return records.map(record => ({
    recordId: record.id,
    testId: record.test_id,
    name: record.name,
  }));
}
