/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#1E293B',
    tint: '#2563EB',
    background: '#F8FAFC',
    foreground: '#1E293B',
    card: '#FFFFFF',
    cardForeground: '#1E293B',
    primary: '#2563EB',
    primaryForeground: '#FFFFFF',
    secondary: '#EFF6FF',
    secondaryForeground: '#1D4ED8',
    muted: '#F1F5F9',
    mutedForeground: '#64748B',
    accent: '#DBEAFE',
    accentForeground: '#1D4ED8',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    border: '#E2E8F0',
    input: '#E2E8F0',
    success: '#10B981',
    successSoft: '#DCFCE7',
    warning: '#F59E0B',
    warningSoft: '#FEF3C7',
    dangerSoft: '#FEE2E2',
    navy: '#0F172A',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
