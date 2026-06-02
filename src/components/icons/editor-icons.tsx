import {
  PiTextB,
  PiTextItalic,
  PiTextUnderline,
  PiTextStrikethrough,
  PiTextHOne,
  PiTextHTwo,
  PiTextHThree,
  PiListBullets,
  PiListNumbers,
  PiQuotes,
  PiCodeBlock,
  PiTextAlignLeft,
  PiTextAlignCenter,
  PiHighlighter,
} from 'react-icons/pi';

import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
}

/**
 * Rich-text editor toolbar icons — Phosphor (react-icons/pi), the panel's
 * icon family (regular weight). Shared by the TipTap toolbars in AdminNewsCreate and
 * AdminInfoPageEditor. Names match the historical local definitions so the
 * toolbars import instead of hand-rolling SVGs.
 */

export const BoldIcon = ({ className }: IconProps) => (
  <PiTextB className={cn('h-5 w-5', className)} />
);

export const ItalicIcon = ({ className }: IconProps) => (
  <PiTextItalic className={cn('h-5 w-5', className)} />
);

export const UnderlineIcon = ({ className }: IconProps) => (
  <PiTextUnderline className={cn('h-5 w-5', className)} />
);

export const StrikeIcon = ({ className }: IconProps) => (
  <PiTextStrikethrough className={cn('h-5 w-5', className)} />
);

export const H1Icon = ({ className }: IconProps) => (
  <PiTextHOne className={cn('h-5 w-5', className)} />
);

export const H2Icon = ({ className }: IconProps) => (
  <PiTextHTwo className={cn('h-5 w-5', className)} />
);

export const H3Icon = ({ className }: IconProps) => (
  <PiTextHThree className={cn('h-5 w-5', className)} />
);

export const ListBulletIcon = ({ className }: IconProps) => (
  <PiListBullets className={cn('h-5 w-5', className)} />
);

export const ListOrderedIcon = ({ className }: IconProps) => (
  <PiListNumbers className={cn('h-5 w-5', className)} />
);

export const QuoteIcon = ({ className }: IconProps) => (
  <PiQuotes className={cn('h-5 w-5', className)} />
);

export const CodeBlockIcon = ({ className }: IconProps) => (
  <PiCodeBlock className={cn('h-5 w-5', className)} />
);

export const AlignLeftIcon = ({ className }: IconProps) => (
  <PiTextAlignLeft className={cn('h-5 w-5', className)} />
);

export const AlignCenterIcon = ({ className }: IconProps) => (
  <PiTextAlignCenter className={cn('h-5 w-5', className)} />
);

export const HighlightIcon = ({ className }: IconProps) => (
  <PiHighlighter className={cn('h-5 w-5', className)} />
);
