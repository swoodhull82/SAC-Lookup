
import PocketBase from 'pocketbase';

// The structure of the JSON file
interface TestData {
  test_id: string;
  name: string;
}

interface SacData {
  sac_code: string;
  name:string;
  description: string;
  bottleware?: string;
  tests: TestData[];
}

export type LogCallback = (message: string) => void;

const POCKETBASE_URL = 'https://dep-sac-lookup.pockethost.io/';
// Rate limit: 50 requests / 10 seconds => 5 req/sec => 1 req / 200ms
const UPLOAD_DELAY_MS = 200; 

// Helper function to add a delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper type for the existing test records from PocketBase
interface ExistingTestRecord {
  id: string;
  test_id: string;
}

interface ExistingSacRecord {
    id: string;
    sac_code: string;
}

export async function uploadData(
  jsonData: SacData[],
  uploaderEmail: string,
  uploaderPassword: string,
  log: LogCallback
): Promise<void> {
  log("Initializing uploader...");
  const pb = new PocketBase(POCKETBASE_URL);

  try {
    // 1. Authenticate as a collection user (more secure than admin)
    log(`Attempting to authenticate as user ${uploaderEmail}...`);
    await pb.collection('users').authWithPassword(uploaderEmail, uploaderPassword);
    log("✅ Authentication successful.");

    // 2. Process and upload all unique tests
    log("\n--- Step 1: Processing Tests ---");
    
    // Efficiently get all existing tests at once
    log("Fetching list of all existing tests from the server...");
    const existingTestsList = await pb.collection('tests').getFullList<ExistingTestRecord>({
        fields: 'id,test_id' // Only fetch the fields we need
    });
    const existingTestsMap = new Map<string, string>();
    existingTestsList.forEach(t => existingTestsMap.set(t.test_id, t.id));
    log(`Found ${existingTestsMap.size} tests already in the database.`);

    const allTestsToProcess = new Map<string, TestData>();
    jsonData.forEach(sac => {
      if (sac.tests && Array.isArray(sac.tests)) {
        sac.tests.forEach(test => {
          if (test && test.test_id && !allTestsToProcess.has(test.test_id)) {
            allTestsToProcess.set(test.test_id, test);
          }
        });
      } else {
        log(`⚠️ WARNING: SAC "${sac.name || sac.sac_code}" is missing a 'tests' array or it's not an array. Skipping.`);
      }
    });

    const testIdToPbRecordId = new Map<string, string>(existingTestsMap);
    log(`Found ${allTestsToProcess.size} unique tests in the JSON file.`);

    for (const test of allTestsToProcess.values()) {
      // Check against our local map instead of making an API call
      if (existingTestsMap.has(test.test_id)) {
        log(`- Test "${test.name}" (${test.test_id}) already exists. Skipping creation.`);
      } else {
        // Test doesn't exist, so let's create it
        try {
          const newTest = await pb.collection('tests').create({
            test_id: test.test_id,
            name: test.name,
          });
          testIdToPbRecordId.set(test.test_id, newTest.id);
          log(`+ Created test "${newTest.name}" (${newTest.test_id}).`);
          await delay(UPLOAD_DELAY_MS); // Apply delay after write operation
        } catch (createError: any) {
          const validationErrors = createError.data?.data;
          let detailedMessage = `Failed to create test "${test.name}" (${test.test_id}).`;
          if (validationErrors) {
            const fieldErrors = Object.entries(validationErrors).map(([field, errorDetails]: [string, any]) => {
              return `${field}: ${errorDetails.message}`;
            }).join(', ');
            detailedMessage += ` Server validation failed: { ${fieldErrors} }`;
          } else {
            detailedMessage += ` Server response: ${createError.message || 'Unknown error'}`;
          }
          log(`❌ ERROR: ${detailedMessage}`);
          throw new Error(detailedMessage);
        }
      }
    }
    log("--- Test processing complete. ---");


    // 3. Process and upload all SACs
    log("\n--- Step 2: Processing SACs ---");
    log("Fetching list of all existing SACs for comparison...");
    const existingSacsList = await pb.collection('sacs').getFullList<ExistingSacRecord>({
        fields: 'id,sac_code'
    });
    const existingSacsMap = new Map<string, string>();
    existingSacsList.forEach(s => existingSacsMap.set(s.sac_code, s.id));
    log(`Found ${existingSacsMap.size} SACs already in the database.`);

    const sacsToCreate: any[] = [];
    const sacsToUpdate: {id: string, data: any}[] = [];

    for (const sac of jsonData) {
        if (!sac.tests || !Array.isArray(sac.tests)) {
            continue;
        }

        const relatedTestPbIds = sac.tests.map(t => testIdToPbRecordId.get(t.test_id)).filter(Boolean) as string[];

        const dataToUpload = {
            sac_code: sac.sac_code,
            name: sac.name,
            description: sac.description || "",
            bottleware: sac.bottleware || "",
            tests: relatedTestPbIds,
        };
        
        const existingSacId = existingSacsMap.get(sac.sac_code);
        if (existingSacId) {
            sacsToUpdate.push({ id: existingSacId, data: dataToUpload });
        } else {
            sacsToCreate.push(dataToUpload);
        }
    }

    log(`\nFound ${sacsToUpdate.length} SACs to update and ${sacsToCreate.length} SACs to create.`);

    // Process updates with a delay
    if(sacsToUpdate.length > 0) {
      log("\n--- Updating existing SACs ---");
      for (const item of sacsToUpdate) {
          try {
              await pb.collection('sacs').update(item.id, item.data);
              log(`~ Updated SAC "${item.data.name}" (${item.data.sac_code}).`);
          } catch (updateError: any) {
              log(`❌ ERROR updating SAC "${item.data.name}": ${updateError.message}`);
          }
          await delay(UPLOAD_DELAY_MS);
      }
    }

    // Process creations with a delay
    if (sacsToCreate.length > 0) {
      log("\n--- Creating new SACs ---");
      for (const item of sacsToCreate) {
          try {
              await pb.collection('sacs').create(item);
              log(`+ Created SAC "${item.name}" (${item.sac_code}).`);
          } catch (createError: any) {
              const validationErrors = createError.data?.data;
              let detailedMessage = `Failed to create SAC "${item.name}" (${item.sac_code}).`;
              if (validationErrors) {
                const fieldErrors = Object.entries(validationErrors).map(([field, errorDetails]: [string, any]) => {
                  return `${field}: ${errorDetails.message}`;
                }).join(', ');
                detailedMessage += ` Server validation failed: { ${fieldErrors} }`;
              } else {
                detailedMessage += ` Server response: ${createError.message || 'Unknown error'}`;
              }
              log(`❌ ERROR: ${detailedMessage}`);
          }
          await delay(UPLOAD_DELAY_MS);
      }
    }

    log("\n--- SAC processing complete. ---");
    log("\n✅ All data has been successfully uploaded!");

  } catch (error: any) {
    const errorMessage = error.data?.message || error.message || "An unexpected error occurred.";
    log(`❌ ERROR: ${errorMessage}`);
    throw new Error(errorMessage);
  } finally {
    if (pb.authStore.isValid) {
      pb.authStore.clear();
      log("\nLogged out user.");
    }
  }
}


export async function consolidateTests(
  oldTestRecordId: string,
  newTestRecordId: string,
  uploaderEmail: string,
  uploaderPassword: string,
  log: LogCallback
): Promise<void> {
  log("Initializing consolidation tool...");
  const pb = new PocketBase(POCKETBASE_URL);

  try {
    log(`Attempting to authenticate as user ${uploaderEmail}...`);
    await pb.collection('users').authWithPassword(uploaderEmail, uploaderPassword);
    log("✅ Authentication successful.");

    log(`\n--- Step 1: Finding SACs containing the old test (ID: ${oldTestRecordId}) ---`);
    const recordsToUpdate = await pb.collection('sacs').getFullList({
        filter: `tests ~ "${oldTestRecordId}"`
    });

    if (recordsToUpdate.length === 0) {
        log("No SACs found containing the old test. Nothing to do.");
        return;
    }

    log(`Found ${recordsToUpdate.length} SACs to update.`);

    log("\n--- Step 2: Updating SACs ---");
    for (const record of recordsToUpdate) {
        const currentTestIds = record.tests || [];

        // Remove old ID
        const filteredIds = currentTestIds.filter((id: string) => id !== oldTestRecordId);

        // Add new ID if not present
        if (!filteredIds.includes(newTestRecordId)) {
            filteredIds.push(newTestRecordId);
        }
        
        try {
            await pb.collection('sacs').update(record.id, { tests: filteredIds });
            log(`~ Updated SAC "${record.name}" (${record.sac_code})`);
        } catch (updateError: any) {
            log(`❌ ERROR updating SAC "${record.name}": ${updateError.message}`);
        }
        await delay(UPLOAD_DELAY_MS); // Respect rate limit
    }
    
    log("\n--- Consolidation complete. ---");
    log(`✅ All relevant SACs have been updated. You can now safely delete the old test record from the PocketBase admin UI.`);

  } catch (error: any) {
    const errorMessage = error.data?.message || error.message || "An unexpected error occurred.";
    log(`❌ ERROR: ${errorMessage}`);
    throw new Error(errorMessage);
  } finally {
    if (pb.authStore.isValid) {
      pb.authStore.clear();
      log("\nLogged out user.");
    }
  }
}
