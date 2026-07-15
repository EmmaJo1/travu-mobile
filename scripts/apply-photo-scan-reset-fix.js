const fs = require('node:fs');
const path = require('node:path');

const targetPath = path.join(
  process.cwd(),
  'services',
  'photoImport',
  'localDetectedTripDraftStore.ts',
);

const source = fs.readFileSync(targetPath, 'utf8');
const marker = "  const scanAttemptId = createPhotoScanAttemptId();\n";
const replacement = `${marker}  drafts.clear();\n  processedCandidateFingerprints.clear();\n  coverHydrationFailedDraftIds.clear();\n  coverHydrationInFlightDraftIds.clear();\n  coverHydrationCompletedDraftIds.clear();\n\n  if (__DEV__) {\n    console.info('[photo-import scan] transient state reset', {\n      photoScanTransientStateReset: true,\n      scanAttemptId,\n    });\n  }\n`;

if (!source.includes(marker)) {
  throw new Error('Could not find scan start marker. Source may have changed.');
}

if (source.includes('photoScanTransientStateReset: true')) {
  console.log('Photo scan reset fix is already applied.');
  process.exit(0);
}

const updated = source.replace(marker, replacement);
fs.writeFileSync(targetPath, updated);
console.log(`Updated ${targetPath}`);
