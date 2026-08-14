/**
 * Travu app-facing content language source of truth.
 *
 * The app does not have a user-selectable language setting yet, so Korean is
 * the current product language. When that setting is introduced, replace the
 * implementation here instead of teaching individual features their own
 * locale rules.
 *
 * Important exception: the Home header's live device-location label is a
 * deliberate product rule and must remain English-only. It must not use this
 * helper.
 */
export function getAppContentLanguageCode(): string {
  return 'ko';
}
