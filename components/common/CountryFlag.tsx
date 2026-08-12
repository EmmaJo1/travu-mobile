import React from 'react';
import { StyleSheet, View } from 'react-native';
import * as FlagXmlMap from 'country-flag-icons/string/3x2';
import { SvgXml } from 'react-native-svg';

import {
  getCountryAccessibilityName,
  getOfficialIsoCountryCodes,
  normalizeCountryCode,
} from '@/services/location/countryCodes';

interface CountryFlagProps {
  accessibilityLabel?: string;
  countryCode?: string | null;
  size?: 'place';
}

const PLACE_FLAG_WIDTH = 21;
const PLACE_FLAG_HEIGHT = 15;
const FLAG_XML_MAP = FlagXmlMap as Record<string, string | undefined>;
let hasLoggedCoverage = false;

function getMappedFlagCodes() {
  return Object.keys(FLAG_XML_MAP)
    .filter((code) => /^[A-Z]{2}$/.test(code))
    .sort();
}

function getFlagXml(countryCode?: string | null) {
  const normalizedCode = normalizeCountryCode(countryCode);

  if (!normalizedCode) {
    return null;
  }

  return FLAG_XML_MAP[normalizedCode] ?? null;
}

export function isSupportedCountryFlagCode(countryCode?: string | null) {
  return Boolean(getFlagXml(countryCode));
}

function logCoverageOnce() {
  if (!__DEV__ || hasLoggedCoverage) {
    return;
  }

  hasLoggedCoverage = true;

  const officialCodes = getOfficialIsoCountryCodes();
  const mappedCodes = getMappedFlagCodes();
  const missingCodes = officialCodes.filter((code) => !mappedCodes.includes(code));
  const duplicateMappedCount = mappedCodes.length - new Set(mappedCodes).size;

  console.info('[country flag asset coverage]', {
    countryFlagAssetCoverage: true,
    duplicateMappedCount,
    mappedAssetCount: mappedCodes.length,
    missingCodes,
    missingCount: missingCodes.length,
    officialIsoCodeCount: officialCodes.length,
  });
}

export default function CountryFlag({ accessibilityLabel, countryCode }: CountryFlagProps) {
  logCoverageOnce();

  const normalizedCode = normalizeCountryCode(countryCode);
  const flagXml = getFlagXml(normalizedCode);

  if (!normalizedCode || !flagXml) {
    return null;
  }

  const countryName = getCountryAccessibilityName(normalizedCode);

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? (countryName ? `${countryName} 국기` : `${normalizedCode} 국기`)}
      accessibilityRole="image"
      style={styles.placeFlag}
    >
      <SvgXml
        height={PLACE_FLAG_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
        width={PLACE_FLAG_WIDTH}
        xml={flagXml}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeFlag: {
    width: PLACE_FLAG_WIDTH,
    height: PLACE_FLAG_HEIGHT,
    overflow: 'hidden',
    borderRadius: 0,
  },
});
