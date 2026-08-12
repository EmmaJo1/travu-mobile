const fs = require('fs');
const path = require('path');
const countries = require('i18n-iso-countries');

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

const NON_OFFICIAL_SUPPORTED_CODES = new Set(['XK']);
const projectRoot = path.resolve(__dirname, '..');
const flagTypesFile = path.join(projectRoot, 'node_modules', 'country-flag-icons', 'string', '3x2', 'index.d.ts');
const officialIsoCodes = Object.keys(countries.getAlpha2Codes())
  .filter((code) => !NON_OFFICIAL_SUPPORTED_CODES.has(code))
  .sort();
const mappedCodes = fs
  .readFileSync(flagTypesFile, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.match(/^export const ([A-Z]{2}): string$/)?.[1])
  .filter(Boolean)
  .sort();
const mappedCodeSet = new Set(mappedCodes);
const missingCodes = officialIsoCodes.filter((code) => !mappedCodeSet.has(code));
const duplicateCodes = mappedCodes.filter((code, index) => mappedCodes.indexOf(code) !== index);
const invalidMappedCodes = mappedCodes.filter((code) => (
  !officialIsoCodes.includes(code) &&
  !NON_OFFICIAL_SUPPORTED_CODES.has(code) &&
  code !== 'EU'
));

console.info('[country flag coverage validation]', {
  duplicateCodes,
  extraNonCountryAssetCodes: invalidMappedCodes,
  mappedAssetCount: mappedCodes.length,
  missingCodes,
  missingCount: missingCodes.length,
  officialIsoCodeCount: officialIsoCodes.length,
});

if (missingCodes.length > 0 || duplicateCodes.length > 0) {
  process.exitCode = 1;
}
