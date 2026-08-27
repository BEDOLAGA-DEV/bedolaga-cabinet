import { useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { getColorGradient } from '@/utils/colorParser';
import { ThemeIcon } from './ThemeIcon';
import type { BlockRendererProps } from './types';

export function AccordionBlock({
  blocks,
  isMobile,
  isLight,
  getLocalizedText,
  getSvgHtml,
  renderBlockButtons,
}: BlockRendererProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const visibleBlocks = blocks.filter(
    (b) =>
      getLocalizedText(b.title) ||
      getLocalizedText(b.description) ||
      b.buttons?.length ||
      b.customNode,
  );

  if (!visibleBlocks.length) return null;

  return (
    <div className="space-y-2">
      {visibleBlocks.map((block, index) => {
        const gradientStyle = getColorGradient(block.svgIconColor || 'cyan', isLight);
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className={`overflow-hidden rounded-2xl border transition-colors ${
              isLight
                ? isOpen
                  ? 'border-accent-500/30 bg-white/80 shadow-sm'
                  : 'border-dark-700/60 bg-white/60'
                : isOpen
                  ? 'border-accent-500/30 bg-dark-800/50'
                  : 'border-dark-700/50 bg-dark-800/50'
            }`}
          >
            {/* Control */}
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <ThemeIcon
                getSvgHtml={getSvgHtml}
                svgIconKey={block.svgIconKey}
                gradientStyle={gradientStyle}
                isMobile={isMobile}
              />
              <span className="min-w-0 flex-1 truncate font-semibold text-dark-100">
                {getLocalizedText(block.title)}
              </span>
              <ChevronDownIcon
                className={`h-[18px] w-[18px] shrink-0 text-dark-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {/* Panel */}
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-dark-400">
                  {getLocalizedText(block.description)}
                </p>
                {renderBlockButtons(block.buttons, 'light')}
                {block.customNode}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
