const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  process.cwd(),
  'services',
  'photoImport',
  'localDetectedTripDraftStore.ts',
);

const source = fs.readFileSync(targetPath, 'utf8');
const before = `  const homeRegionEvaluations = applyHomeRegionCandidateFilter(\n    nextDrafts,\n    loadedHomeRegion,\n    HOME_REGION_EXCLUSION_RADIUS_KM,\n    scanAttemptId,\n  );`;
const after = `  const homeRegionEvaluations = await applyHomeRegionCandidateFilter(\n    nextDrafts,\n    loadedHomeRegion,\n    HOME_REGION_EXCLUSION_RADIUS_KM,\n    scanAttemptId,\n  );`;

if (source.includes(after)) {
  console.log('Home-region address filter await already applied.');
  process.exit(0);
}

if (!source.includes(before)) {
  throw new Error('Expected home-region filter call was not found.');
}

fs.writeFileSync(targetPath, source.replace(before, after));
console.log('Applied async administrative-region home filter.');
