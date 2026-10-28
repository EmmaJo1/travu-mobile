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

# Travu Location Language Rules

## Current device location is always English

The Home header's **current device location** is a special case and must always be displayed in English, regardless of the app's selected language or locale.

Examples:

- `광주광역시` -> `Gwangju`
- `서울특별시` -> `Seoul`
- `大阪市` -> `Osaka`

Do not change this behavior when adding app localization.

## Saved travel/place geographic labels follow the app language at display time

Geographic labels that belong to saved travel/place data should follow the app's selected language when localization is available. This includes items such as:

- saved place address
- saved place city
- saved place country
- trip/destination city or country labels derived from saved place/travel data

Example when the app language is Korean:

- city display: `오사카`
- country display: `일본`

Important persistence rule:

- Do **not** rewrite Google place identity, coordinates, or source geographic values into a permanently Korean-only form just to satisfy the current UI language.
- Keep `google_place_id` and coordinates language-independent.
- Treat Google-returned city/country/address strings as source data/fallback data.
- Apply locale-aware labels in the presentation/mapping layer so a future app-language setting can switch display languages without a database rewrite.
- If a translation for the selected app language is unavailable, fall back to the source value rather than forcing Korean.

This rule does **not** apply to the Home header current-device-location label, which remains English.

# Travu Status Bar Rules

## Home is the only light status-bar screen

- The normal Travu Home screen must always use light/white status-bar content.
- This applies to both idle Home and active-trip Home.
- Home loading/error states also belong to Home and should use light status-bar content unless the product rule is explicitly changed later.

## Every non-Home screen uses dark status-bar content

- Every screen other than Home must always use dark/black status-bar content.
- This includes tab screens such as My Page and Library, and pushed screens such as trip detail, place detail, settings, photo-import flows, etc.
- A screen must not accidentally inherit Home's light status-bar state.
- Navigating away from Home must restore dark status-bar content.
- Navigating back to Home must restore light status-bar content.

## Ownership rule

- Prefer one centralized, route-aware status-bar owner.
- Do not scatter duplicated status-bar fixes across individual screens unless technically unavoidable.
- Do not change this policy during unrelated UI work.
