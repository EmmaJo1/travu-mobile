# Travu Styling Rules

## Theme tokens are mandatory

Before creating or modifying any UI component, always read:

- `constants/theme.ts`
- the nearest existing component with a similar visual role

Reuse existing theme tokens whenever possible.

Priority order:

1. `Typography`
2. `Colors`
3. `Spacing`
4. `Radius`
5. `Shadows`
6. `FontFamily`

Do not hardcode values when an equivalent token already exists.

Examples:

```ts
color: Colors.foundation.black
backgroundColor: Colors.foundation.white
borderRadius: Radius.sm
fontFamily: FontFamily.pretendardMedium
...Typography.body2Regular
```

Hardcoded values are allowed only when:

- the Figma value does not exist in `constants/theme.ts`
- the value is specific to this component
- adding a global token would be excessive

When hardcoding a style value, leave a short inline comment only when the reason is not obvious.

Do not modify `constants/theme.ts` casually.

Add a new token only when:

- the same value is reused in multiple components
- the token clearly belongs to the design system
- the existing token set does not already contain an equivalent value

Before finishing a UI task, report:

1. which theme tokens were reused
2. which values were hardcoded
3. why each hardcoded value was necessary
4. whether `constants/theme.ts` was modified
