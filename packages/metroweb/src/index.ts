// metroweb: Windows Phone 8's Metro design for React. Import the styles once
// as well: import 'metroweb/styles.css'. The design docs say where each value
// comes from: https://wp8.vercel.app/design

// Theme: the 20 accents, the dark and light palettes as CSS variables.
export { ACCENTS, DEFAULT_ACCENT, DEFAULT_BACKGROUND, themeVariables } from './theme.ts'
export type { Accent, Background } from './theme.ts'

// Motion: Toolkit and UIX easings, transitions and timings.
export {
  continuum,
  dropOut,
  EXPO_IN_2,
  EXPO_IN_6,
  EXPO_OUT_2,
  EXPO_OUT_5,
  EXPO_OUT_6,
  EXPO_OUT_15,
  FEATHER_MAX_DELAY,
  FEATHER_PIXEL_DELAY,
  hubSwing,
  nativePageTurn,
  NATIVE_PERSPECTIVE,
  NATIVE_TURNSTILE,
  PANORAMA_INTRO_DURATION,
  panoramaIntro,
  prefersReducedMotion,
  scrimFade,
  slideSheet,
  swivel,
  TOOLKIT_TURNSTILE,
  turnstile,
  turnstileFeather,
} from './motion.ts'
export type { ContinuumPhase, FeatherPlacement, TurnstileMode, TurnstileTiming } from './motion.ts'
export { featherPage } from './pageMotion.ts'
export type { FeatherOptions } from './pageMotion.ts'
export { getMotionSpeed, MOTION_SPEEDS, motionMs, setMotionSpeed, subscribeMotionSpeed } from './motionSpeed.ts'

// Navigation: the page stack and the app's root.
export { PageStack, useNavigation } from './navigation.tsx'
export type { BackHandler, PageStackProps, StackHandle } from './navigation.tsx'
export { PhoneFrame } from './components/PhoneFrame.tsx'
export type { PhoneFrameProps } from './components/PhoneFrame.tsx'
export { NavigationBar } from './components/NavigationBar.tsx'
export type { NavigationBarProps } from './components/NavigationBar.tsx'

// Components.
export { Button, ListItem, Paragraph, SettingsPage } from './components/controls.tsx'
export { Pivot } from './components/Pivot.tsx'
export type { PivotItem } from './components/Pivot.tsx'
export { Panorama } from './components/Panorama.tsx'
export type { PanoramaSection } from './components/Panorama.tsx'
export { AppBar } from './components/AppBar.tsx'
export type { AppBarButtonDef, AppBarMenuItemDef } from './components/AppBar.tsx'
export { ToggleSwitch } from './components/ToggleSwitch.tsx'
export { ListPicker } from './components/ListPicker.tsx'
export type { PickerOption } from './components/ListPicker.tsx'
export { AccentPicker } from './components/AccentPicker.tsx'
export { DatePicker, TimePicker } from './components/DateTimePicker.tsx'
export { LoopingSelector } from './components/LoopingSelector.tsx'
export { TextBox } from './components/TextBox.tsx'
export type { TextBoxProps } from './components/TextBox.tsx'
export { MessageBox } from './components/MessageBox.tsx'
export type { MessageBoxButton } from './components/MessageBox.tsx'
export { FullScreenPopup } from './components/popup.tsx'
export { PopupCloseContext, PopupLayerContext, usePopupClose, usePopupLayer } from './components/popupLayer.ts'
export { useModal, useModalOpen } from './components/modal.ts'
export { useTilt } from './components/useTilt.ts'

// Icons: Phosphor glyphs (MIT) standing in for the phone's own.
export { GLYPHS } from './components/glyphs.tsx'
export type { GlyphName } from './components/glyphs.tsx'
export { PhIcon } from './icons/PhIcon.tsx'
export { ph } from './icons/ph.tsx'
export { PH } from './icons/phosphor.ts'
export type { PhName } from './icons/phosphor.ts'

// Formatting: the phone's en-US times and short dates.
export { formatShortDate, formatTimeOfDay } from './format.ts'
