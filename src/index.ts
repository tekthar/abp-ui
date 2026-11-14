// @abpjs/ui: the design system for ABP applications on Chakra UI v3 and React 19. Tokens, recipes and components
// that name no product: the host gives its CSS prefix, its colours and its words.

// System
export { abpConfig, createAbpSystem, type AbpSystemOptions } from './theme/system';
export { defaultBrand, type AbpBrand, type Scale } from './theme/brand';
export { useTokenVar } from './theme/token-var';
export { ABP_UI_VERSION } from './version';


// Providers and hooks
export { AbpProvider, type AbpProviderProps } from './provider/AbpProvider';
export { ColorModeProvider, ColorModeToggle, useColorMode, type ColorMode } from './provider/color-mode';
export { defaultLabels, defaultQueryListLabels, useAbpLabels, type AbpLabels, type QueryListLabels } from './provider/labels';
export { AppLink, useLinkComponent, type AppLinkProps, type LinkComponent } from './provider/link';
export { directionOf, useAbpLocale, type Direction } from './provider/locale';
export { useAbpTimeZone } from './provider/time-zone';
export { PluginTextsProvider, usePluginTexts, useProductName } from './provider/texts';
export { composeTitle, PageTitleProvider, partsOf, TITLE_SEPARATOR, usePageTitle, usePageTitleParts, usePageTitleSite, type TitleParts } from './provider/title';
export { compareOrdinal } from './utils/compare';
export { EMPTY_VALUE, formatDateTime, formatNumber, useFormatters } from './utils/format';

// Motion (ADR 0058): pages and plugins move through these, never through Motion itself
export {
  ArriveOnChange,
  Collapse,
  Counter,
  FadeIn,
  Indicator,
  Nudge,
  Presence,
  PresenceItem,
  PresenceList,
  Pressable,
  Reveal,
  RevealItem,
  SlideItem,
  SlideList,
  Swap,
  type ArriveOnChangeProps,
  type CollapseProps,
  type CounterProps,
  type FadeInProps,
  type IndicatorProps,
  type NudgeProps,
  type PresenceItemProps,
  type PresenceListProps,
  type PresenceProps,
  type PressableProps,
  type RevealItemProps,
  type RevealProps,
  type SlideItemProps,
  type SlideListProps,
  type SwapProps,
} from './motion/components';
export { useCelebrate, type CelebrateTarget } from './motion/Celebrate';
export { MotionProvider } from './motion/MotionProvider';
export { asMotionSetting, useMotionSetting, type MotionSetting, type MotionState } from './motion/setting';
export { burst, hiddenPose, SHOWN, staggerDelay, type Arrival, type Particle, type Pose } from './motion/presets';
export { curves, durations as motionDurations, springs } from './motion/tokens';

// Components
export {
  AppShell,
  type AppShellBrand,
  type AppShellNavItem,
  type AppShellNavSection,
  type AppShellPlace,
  type AppShellProps,
  type AppShellSidebar,
} from './components/AppShell';
export { Pagination, type PaginationProps } from './components/Pagination';
export { CommandPalette, HighlightText, type CommandGroup, type CommandItem, type CommandPaletteProps } from './components/CommandPalette';
export { pageList } from './components/pageList';
export { AvatarStack, avatarPalette, type AvatarPerson, type AvatarStackProps } from './components/AvatarStack';
export { Button, IconButton, type ButtonProps, type ButtonSize, type ButtonVariant, type IconButtonProps } from './components/Button';
export {
  ConfirmDialog,
  ConfirmProvider,
  useConfirm,
  type ConfirmDialogProps,
  type ConfirmOptions,
} from './components/ConfirmDialog';
export {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  type DataTableSelection,
  type DataTableSort,
  type SortDirection,
} from './components/DataTable';
export { CalendarGrid, type CalendarGridProps, type CalendarItem } from './components/CalendarGrid';
export { Chart, type ChartProps, type ChartSeries } from './components/Chart';
export { compactLayout, DashboardGrid, placeItem, type DashboardGridProps, type GridItem } from './components/DashboardGrid';
export { CategoryProgress, type CategoryProgressProps } from './components/CategoryProgress';
export { DirectionalIcon } from './components/DirectionalIcon';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { AttentionChip, type AttentionChipProps } from './components/AttentionChip';
export { CountBadge, type CountBadgeProps } from './components/CountBadge';
export { IconTile, type IconTileProps } from './components/IconTile';
export { PersonChip, type PersonChipProps } from './components/PersonChip';
export { PriorityMark, type PriorityMarkProps } from './components/PriorityMark';
export { priorityLevel } from './components/priority-level';
export { groupKey, heavierFirst, inSections } from './rules';

// The host contract for the screens (ADR 0109 amendment): how they call the host's server, move, ask what the person
// may do, and read their words
export { AbpApiError, errorText, isStepUp, needsStepUp, readAbpError, STEP_UP_REQUIRED, STRONG_FACTOR_REQUIRED } from './host/errors';
export { createHostEvents, readEvents, type HostEventHandler, type HostEvents } from './host/events';
export { createHostRequest, fileNameOf, type HostFile, type HostRequest, type HostRequestInit, type HostRequestOptions } from './host/request';
export {
  HostProvider,
  HostSlot,
  useApiAction,
  useApiDownload,
  useApiQuery,
  useAreaEvents,
  useAreaRequest,
  useCan,
  useHost,
  useHostLanguages,
  useMe,
  useNames,
  useNavigate,
  useOptionalHost,
  type AbpHost,
  type ApiQuery,
  type HostLanguage,
  type HostScope,
} from './host/HostContext';
export { useSlotSaves, type RegisterSlotSave, type SlotSave } from './host/slot-saves';
export { requestStepUp, setStepUpHandler, stepUpNeedOf, type StepUpHandler, type StepUpNeed } from './host/step-up';
export { looksLikeCode, StepUpDialog } from './host/StepUpDialog';
export { formatMessage } from './texts/format';
export { createAreaTexts, type AreaTexts } from './texts/area';
export { FormDialog, type FormDialogProps } from './components/FormDialog';

// Settings areas (ADR 0095, ADR 0109): sections and pages by weight, static and loaded, and their frame
export { findSettingsPage, settingsArea, type SettingsArea, type SettingsPage, type SettingsSection } from './settings/registry';
export { SettingsLayout, type SettingsLayoutProps } from './settings/SettingsLayout';
export { SegmentedControl, type SegmentedControlProps, type SegmentedItem } from './components/SegmentedControl';
export {
  CheckboxField,
  Field,
  FormField,
  SelectField,
  SwitchField,
  type CheckboxFieldProps,
  type FieldProps,
  type SelectFieldProps,
  type SelectOption,
  type SwitchFieldProps,
} from './components/Field';
export { InlineAlert, type InlineAlertProps } from './components/InlineAlert';
export { KanbanBoard, type KanbanBoardProps, type KanbanColumn, type KanbanItem, type KanbanLane, type KanbanMove } from './components/KanbanBoard';
export { LoadingState } from './components/LoadingState';
// Skeletons (ADR 0061): every component draws itself while its data loads.
export { Loading, useArriving, useLoading, type LoadingProps } from './skeleton/loading';
export { arriveCss, Bone, boneWidth, ghostCss, shineCss, TextBone, TextSlot, type BoneProps, type TextBoneProps, type TextSlotProps } from './skeleton/bones';
export { Breadcrumbs, PageHeader, type BreadcrumbItem, type PageHeaderProps } from './components/PageHeader';
export { Panel, PanelTone, type PanelProps } from './components/Panel';
export { PathChips, type PathChipsProps } from './components/PathChips';
export { PropertyList, type PropertyItem, type PropertyListProps } from './components/PropertyList';
export {
  basicConditions,
  QueryableList,
  type QueryableListError,
  type QueryableListExport,
  type QueryableListProps,
  type QueryableListState,
  type QueryableListView,
  type QueryConditionJson,
  type QueryExportFormat,
  type QueryField,
  type QueryGroup,
  type QueryJson,
  type QueryNodeJson,
  type QueryRow,
  type QuerySuggestion,
  type QuerySuggestions,
  type QueryValueEditor,
} from './components/QueryableList';
export { RecordKey, type RecordKeyProps } from './components/RecordKey';
export { DropHint, FileDropArea, type DropHintProps, type FileDropAreaProps } from './components/FileDrop';
export { UploadList, type UploadListProps, type UploadRow } from './components/UploadList';
export {
  droppedFiles,
  useDropZone,
  useFilesOverPage,
  usePageDrop,
  usePastedFiles,
  type DropZoneOptions,
  type DropZoneState,
  type DroppedFile,
} from './files/drop';
export {
  covers,
  folderOf,
  foldersFor,
  pastedName,
  progressOf,
  refusal,
  targetOf,
  toStart,
  UPLOADS_AT_ONCE,
  type QueueProgress,
  type UploadJob,
  type UploadState,
} from './files/upload-plan';
export { SearchInput, type SearchInputProps } from './components/SearchInput';
export { SortableSections, type SectionMove, type SortableSection, type SortableSectionsProps } from './components/SortableSections';
export { StatusPill, type StatusCategory, type StatusPillProps, type StatusTone } from './components/StatusPill';
export { notify, toaster, Toaster } from './components/Toaster';
export { TimelineChart, type TimelineChartProps, type TimelineItem, type TimelineRow } from './components/TimelineChart';
export { TimelineCards, type TimelineCardsProps, type TimelineCardItem, type TimelineScale } from './components/TimelineCards';
export { placeCards, type CardDates, type PlacedCard } from './components/timeline-cards-math';
export { Tooltip, type TooltipProps } from './components/Tooltip';
