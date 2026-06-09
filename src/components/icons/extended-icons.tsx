import {
  PiSlidersHorizontal,
  PiWrench,
  PiBookOpen,
  PiHeadset,
  PiArrowDown,
  PiArrowRight,
  PiArrowUp,
  PiProhibit,
  PiMoney,
  PiBell,
  PiLightning,
  PiRobot,
  PiBroadcast,
  PiAppWindow,
  PiCalendarDots,
  PiCreditCard,
  PiChartBar,
  PiCheckCircle,
  PiCaretUpDown,
  PiCaretDown,
  PiCaretLeft,
  PiCaretUp,
  PiCurrencyBtc,
  PiDevices,
  PiFileText,
  PiCircleFill,
  PiEnvelope,
  PiWarning,
  PiArrowSquareOut,
  PiEye,
  PiFunnel,
  PiDotsSix,
  PiDotsSixVertical,
  PiHeartbeat,
  PiClockCounterClockwise,
  PiImage,
  PiInfinity,
  PiLink,
  PiMegaphone,
  PiMinus,
  PiNewspaper,
  PiHandshake,
  PiPushPin,
  PiPlus,
  PiPower,
  PiQuestion,
  PiRepeat,
  PiFlag,
  PiArrowCounterClockwise,
  PiArrowClockwise,
  PiCloudWarning,
  PiRocket,
  PiFloppyDisk,
  PiPaperPlaneTilt,
  PiPercent,
  PiHardDrives,
  PiGearSix,
  PiShareNetwork,
  PiSparkle,
  PiChartLine,
  PiGift,
  PiTimer,
  PiCircle,
  PiTag,
  PiTelegramLogo,
  PiTicket,
  PiGauge,
  PiTrash,
  PiTrophy,
  PiPushPinSlash,
  PiUserPlus,
  PiUsersThree,
  PiVideoCamera,
  PiXCircle,
  PiX,
  PiKey,
  PiTray,
  PiExport,
  PiWarningCircle,
  PiCalendarBlank,
  PiCalendarStar,
  PiChartPie,
  PiChartDonut,
  PiCpu,
  PiMemory,
  PiPulse,
} from 'react-icons/pi';

import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
}

/**
 * Extended cabinet icon set — Phosphor (react-icons/pi), the panel's
 * icon family. These cover the icons that used to be hand-written inline across
 * feature pages and components. Names match the historical local definitions so
 * every page can import from the central barrel instead of redefining SVGs.
 */

export const AdjustmentsIcon = ({ className }: IconProps) => (
  <PiSlidersHorizontal className={cn('h-5 w-5', className)} />
);

export const WrenchIcon = ({ className }: IconProps) => (
  <PiWrench className={cn('h-5 w-5', className)} />
);

export const BookOpenIcon = ({ className }: IconProps) => (
  <PiBookOpen className={cn('h-5 w-5', className)} />
);

export const AgentIcon = ({ className }: IconProps) => (
  <PiHeadset className={cn('h-5 w-5', className)} />
);

export const ArrowDownIcon = ({ className }: IconProps) => (
  <PiArrowDown className={cn('h-5 w-5', className)} />
);

export const ArrowIcon = ({ className }: IconProps) => (
  <PiArrowRight className={cn('h-5 w-5', className)} />
);

export const ArrowUpIcon = ({ className }: IconProps) => (
  <PiArrowUp className={cn('h-5 w-5', className)} />
);

export const BanIcon = ({ className }: IconProps) => (
  <PiProhibit className={cn('h-5 w-5', className)} />
);

export const KeyIcon = ({ className }: IconProps) => <PiKey className={cn('h-5 w-5', className)} />;

export const InboxIcon = ({ className }: IconProps) => (
  <PiTray className={cn('h-5 w-5', className)} />
);

export const ExportIcon = ({ className }: IconProps) => (
  <PiExport className={cn('h-5 w-5', className)} />
);

export const WarningCircleIcon = ({ className }: IconProps) => (
  <PiWarningCircle className={cn('h-5 w-5', className)} />
);

export const HeartbeatIcon = ({ className }: IconProps) => (
  <PiHeartbeat className={cn('h-5 w-5', className)} />
);

export const CalendarBlankIcon = ({ className }: IconProps) => (
  <PiCalendarBlank className={cn('h-5 w-5', className)} />
);

export const CalendarStarIcon = ({ className }: IconProps) => (
  <PiCalendarStar className={cn('h-5 w-5', className)} />
);

export const ChartPieIcon = ({ className }: IconProps) => (
  <PiChartPie className={cn('h-5 w-5', className)} />
);

export const ChartDonutIcon = ({ className }: IconProps) => (
  <PiChartDonut className={cn('h-5 w-5', className)} />
);

export const CpuIcon = ({ className }: IconProps) => <PiCpu className={cn('h-5 w-5', className)} />;

export const MemoryIcon = ({ className }: IconProps) => (
  <PiMemory className={cn('h-5 w-5', className)} />
);

export const PulseIcon = ({ className }: IconProps) => (
  <PiPulse className={cn('h-5 w-5', className)} />
);

export const BanknotesIcon = ({ className }: IconProps) => (
  <PiMoney className={cn('h-5 w-5', className)} />
);

export const BellIcon = ({ className }: IconProps) => (
  <PiBell className={cn('h-5 w-5', className)} />
);

export const BoltIcon = ({ className }: IconProps) => (
  <PiLightning className={cn('h-5 w-5', className)} />
);

export const BotIcon = ({ className }: IconProps) => (
  <PiRobot className={cn('h-5 w-5', className)} />
);

export const BroadcastIcon = ({ className }: IconProps) => (
  <PiBroadcast className={cn('h-5 w-5', className)} />
);

export const CabinetIcon = ({ className }: IconProps) => (
  <PiAppWindow className={cn('h-5 w-5', className)} />
);

export const CalendarIcon = ({ className }: IconProps) => (
  <PiCalendarDots className={cn('h-5 w-5', className)} />
);

export const CardIcon = ({ className }: IconProps) => (
  <PiCreditCard className={cn('h-5 w-5', className)} />
);

export const ChannelIcon = ({ className }: IconProps) => (
  <PiBroadcast className={cn('h-5 w-5', className)} />
);

export const ChartBarIcon = ({ className }: IconProps) => (
  <PiChartBar className={cn('h-5 w-5', className)} />
);

export const CheckCircleIcon = ({ className }: IconProps) => (
  <PiCheckCircle className={cn('h-5 w-5', className)} />
);

export const ChevronExpandIcon = ({ className }: IconProps) => (
  <PiCaretUpDown className={cn('h-5 w-5', className)} />
);

export const ChevronIcon = ({ className }: IconProps) => (
  <PiCaretDown className={cn('h-5 w-5', className)} />
);

export const ChevronLeftIcon = ({ className }: IconProps) => (
  <PiCaretLeft className={cn('h-5 w-5', className)} />
);

export const ChevronUpIcon = ({ className }: IconProps) => (
  <PiCaretUp className={cn('h-5 w-5', className)} />
);

export const CryptoIcon = ({ className }: IconProps) => (
  <PiCurrencyBtc className={cn('h-5 w-5', className)} />
);

export const DevicesIcon = ({ className }: IconProps) => (
  <PiDevices className={cn('h-5 w-5', className)} />
);

export const DocumentIcon = ({ className }: IconProps) => (
  <PiFileText className={cn('h-5 w-5', className)} />
);

export const DotIcon = ({ className }: IconProps) => (
  <PiCircleFill className={cn('h-2 w-2', className)} />
);

export const EmailIcon = ({ className }: IconProps) => (
  <PiEnvelope className={cn('h-5 w-5', className)} />
);

export const ExclamationIcon = ({ className }: IconProps) => (
  <PiWarning className={cn('h-5 w-5', className)} />
);

export const ExternalLinkIcon = ({ className }: IconProps) => (
  <PiArrowSquareOut className={cn('h-5 w-5', className)} />
);

export const EyeIcon = ({ className }: IconProps) => <PiEye className={cn('h-5 w-5', className)} />;

export const FileTextIcon = ({ className }: IconProps) => (
  <PiFileText className={cn('h-5 w-5', className)} />
);

export const FilterIcon = ({ className }: IconProps) => (
  <PiFunnel className={cn('h-5 w-5', className)} />
);

export const GripIcon = ({ className }: IconProps) => (
  <PiDotsSix className={cn('h-5 w-5', className)} />
);

export const GripVerticalIcon = ({ className }: IconProps) => (
  <PiDotsSixVertical className={cn('h-5 w-5', className)} />
);

export const HealthIcon = ({ className }: IconProps) => (
  <PiHeartbeat className={cn('h-5 w-5', className)} />
);

export const HistoryIcon = ({ className }: IconProps) => (
  <PiClockCounterClockwise className={cn('h-5 w-5', className)} />
);

export const ImageIcon = ({ className }: IconProps) => (
  <PiImage className={cn('h-5 w-5', className)} />
);

export const InfinityIcon = ({ className }: IconProps) => (
  <PiInfinity className={cn('h-5 w-5', className)} />
);

export const LinkIcon = ({ className }: IconProps) => (
  <PiLink className={cn('h-5 w-5', className)} />
);

export const MailIcon = ({ className }: IconProps) => (
  <PiEnvelope className={cn('h-5 w-5', className)} />
);

export const MegaphoneIcon = ({ className }: IconProps) => (
  <PiMegaphone className={cn('h-5 w-5', className)} />
);

export const MinusIcon = ({ className }: IconProps) => (
  <PiMinus className={cn('h-5 w-5', className)} />
);

export const NewsIcon = ({ className }: IconProps) => (
  <PiNewspaper className={cn('h-5 w-5', className)} />
);

export const PartnerIcon = ({ className }: IconProps) => (
  <PiHandshake className={cn('h-5 w-5', className)} />
);

export const PhotoIcon = ({ className }: IconProps) => (
  <PiImage className={cn('h-5 w-5', className)} />
);

export const PercentIcon = ({ className }: IconProps) => (
  <PiPercent className={cn('h-5 w-5', className)} />
);

export const PinIcon = ({ className }: IconProps) => (
  <PiPushPin className={cn('h-5 w-5', className)} />
);

export const PlusSmallIcon = ({ className }: IconProps) => (
  <PiPlus className={cn('h-4 w-4', className)} />
);

export const PowerIcon = ({ className }: IconProps) => (
  <PiPower className={cn('h-5 w-5', className)} />
);

export const QuestionIcon = ({ className }: IconProps) => (
  <PiQuestion className={cn('h-5 w-5', className)} />
);

export const RepeatIcon = ({ className }: IconProps) => (
  <PiRepeat className={cn('h-5 w-5', className)} />
);

export const ReportIcon = ({ className }: IconProps) => (
  <PiFlag className={cn('h-5 w-5', className)} />
);

export const ResetIcon = ({ className }: IconProps) => (
  <PiArrowCounterClockwise className={cn('h-5 w-5', className)} />
);

export const RestartIcon = ({ className }: IconProps) => (
  <PiArrowClockwise className={cn('h-5 w-5', className)} />
);

export const CloudWarningIcon = ({ className }: IconProps) => (
  <PiCloudWarning className={cn('h-5 w-5', className)} />
);

export const RocketIcon = ({ className }: IconProps) => (
  <PiRocket className={cn('h-5 w-5', className)} />
);

export const SaveIcon = ({ className }: IconProps) => (
  <PiFloppyDisk className={cn('h-5 w-5', className)} />
);

export const SendIcon = ({ className }: IconProps) => (
  <PiPaperPlaneTilt className={cn('h-5 w-5', className)} />
);

export const ServerSmallIcon = ({ className }: IconProps) => (
  <PiHardDrives className={cn('h-4 w-4', className)} />
);

export const SettingsIcon = ({ className }: IconProps) => (
  <PiGearSix className={cn('h-5 w-5', className)} />
);

export const ShareIcon = ({ className }: IconProps) => (
  <PiShareNetwork className={cn('h-5 w-5', className)} />
);

export const SparklesIcon = ({ className }: IconProps) => (
  <PiSparkle className={cn('h-5 w-5', className)} />
);

export const StatBotIcon = ({ className }: IconProps) => (
  <PiRobot className={cn('h-5 w-5', className)} />
);

export const StatCabinetIcon = ({ className }: IconProps) => (
  <PiAppWindow className={cn('h-5 w-5', className)} />
);

export const StatPaidIcon = ({ className }: IconProps) => (
  <PiMoney className={cn('h-5 w-5', className)} />
);

export const StatsChartIcon = ({ className }: IconProps) => (
  <PiChartLine className={cn('h-5 w-5', className)} />
);

export const StatTrialIcon = ({ className }: IconProps) => (
  <PiGift className={cn('h-5 w-5', className)} />
);

export const StatUptimeIcon = ({ className }: IconProps) => (
  <PiTimer className={cn('h-5 w-5', className)} />
);

export const StatusIcon = ({ className }: IconProps) => (
  <PiCircle className={cn('h-5 w-5', className)} />
);

export const TagIcon = ({ className }: IconProps) => <PiTag className={cn('h-5 w-5', className)} />;

export const TelegramIcon = ({ className }: IconProps) => (
  <PiTelegramLogo className={cn('h-5 w-5', className)} />
);

export const TelegramSmallIcon = ({ className }: IconProps) => (
  <PiTelegramLogo className={cn('h-4 w-4', className)} />
);

export const TicketIcon = ({ className }: IconProps) => (
  <PiTicket className={cn('h-5 w-5', className)} />
);

export const TrafficIcon = ({ className }: IconProps) => (
  <PiGauge className={cn('h-5 w-5', className)} />
);

export const TrashSmallIcon = ({ className }: IconProps) => (
  <PiTrash className={cn('h-4 w-4', className)} />
);

export const TrophyIcon = ({ className }: IconProps) => (
  <PiTrophy className={cn('h-5 w-5', className)} />
);

export const UnpinIcon = ({ className }: IconProps) => (
  <PiPushPinSlash className={cn('h-5 w-5', className)} />
);

export const UserPlusIcon = ({ className }: IconProps) => (
  <PiUserPlus className={cn('h-5 w-5', className)} />
);

export const UsersOnlineIcon = ({ className }: IconProps) => (
  <PiUsersThree className={cn('h-5 w-5', className)} />
);

export const VideoIcon = ({ className }: IconProps) => (
  <PiVideoCamera className={cn('h-5 w-5', className)} />
);

export const WarningIcon = ({ className }: IconProps) => (
  <PiWarning className={cn('h-5 w-5', className)} />
);

export const XCircleIcon = ({ className }: IconProps) => (
  <PiXCircle className={cn('h-5 w-5', className)} />
);

export const XCloseIcon = ({ className }: IconProps) => (
  <PiX className={cn('h-5 w-5', className)} />
);

export const XMarkIcon = ({ className }: IconProps) => <PiX className={cn('h-5 w-5', className)} />;
