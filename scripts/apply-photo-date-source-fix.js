const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  process.cwd(),
  'services',
  'photoImport',
  'localDetectedTripDraftStore.ts',
);

const original = fs.readFileSync(targetPath, 'utf8');

const oldFunction = `function getScannedAssetDate(asset: ScannedAsset, fallbackDate: Date): Date {
  const exif = 'exif' in asset && asset.exif ? asset.exif as Record<string, unknown> : {};
  const candidates = [
    exif.DateTimeOriginal,
    exif.DateTimeDigitized,
    exif.DateTime,
    exif.CreationDate,
    asset.creationTime,
    asset.modificationTime,
  ];

  for (const candidate of candidates) {
    const date = parseExifDate(candidate);

    if (date) {
      return date;
    }
  }

  return fallbackDate;
}`;

const newFunction = `function getScannedAssetDate(asset: ScannedAsset, fallbackDate: Date): Date {
  const exif = 'exif' in asset && asset.exif ? asset.exif as Record<string, unknown> : {};
  const dateCandidates = [
    { source: 'asset_creation_time', value: asset.creationTime },
    { source: 'asset_modification_time', value: asset.modificationTime },
    { source: 'exif_date_time_original', value: exif.DateTimeOriginal },
    { source: 'exif_date_time_digitized', value: exif.DateTimeDigitized },
    { source: 'exif_date_time', value: exif.DateTime },
    { source: 'exif_creation_date', value: exif.CreationDate },
  ] as const;

  for (const candidate of dateCandidates) {
    const date = parseExifDate(candidate.value);

    if (!date) {
      continue;
    }

    if (__DEV__ && date.getFullYear() >= 2025) {
      console.info('[photo-import scan] photoScanDateSourceAudit', {
        assetCreationTime: getDateTimestamp(asset.creationTime),
        exifDateTimeOriginal: getDateTimestamp(exif.DateTimeOriginal as string | number | Date | null | undefined),
        selectedSource: candidate.source,
        selectedTakenAt: date.toISOString(),
      });
    }

    return date;
  }

  return fallbackDate;
}`;

if (!original.includes(oldFunction)) {
  console.error('Target function did not match the expected source. No files changed.');
  process.exit(1);
}

const updated = original.replace(oldFunction, newFunction);
fs.writeFileSync(targetPath, updated, 'utf8');
console.log('Applied MediaLibrary creationTime-first takenAt fix.');
