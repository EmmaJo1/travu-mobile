import React from 'react';
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

export type TextInputProps = RNTextInputProps;

const AppTextInput = React.forwardRef<RNTextInput, TextInputProps>(
  function AppTextInput(
    { allowFontScaling = false, maxFontSizeMultiplier = 1, ...rest },
    ref,
  ) {
    return (
      <RNTextInput
        ref={ref}
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        {...rest}
      />
    );
  },
);

export default AppTextInput;
