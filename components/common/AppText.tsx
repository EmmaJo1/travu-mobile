import React from 'react';
import {
  Platform,
  Text as RNText,
  type TextProps as RNTextProps,
} from 'react-native';

export type TextProps = RNTextProps;

/**
 * RN Text wrapper — React 19에서 defaultProps가 제거되어
 * OS 접근성 글자 크기(fontScale)가 Figma px보다 작게 보이는 문제를 방지합니다.
 */
const AppText = React.forwardRef<RNText, TextProps>(function AppText(
  { allowFontScaling = false, maxFontSizeMultiplier = 1, style, ...rest },
  ref,
) {
  return (
    <RNText
      ref={ref}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[Platform.OS === 'android' ? styles.android : null, style]}
      {...rest}
    />
  );
});

const styles = {
  android: {
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
  },
};

export default AppText;
