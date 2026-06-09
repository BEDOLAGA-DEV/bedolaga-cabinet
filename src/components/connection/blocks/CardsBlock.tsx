import { getColorGradient } from '@/utils/colorParser';
import { ThemeIcon } from './ThemeIcon';
import type { BlockRendererProps } from './types';

export function CardsBlock({
  blocks,
  isMobile,
  isLight,
  getLocalizedText,
  getSvgHtml,
  renderBlockButtons,
}: BlockRendererProps) {
  const visibleBlocks = blocks.filter(
    (b) =>
      getLocalizedText(b.title) ||
      getLocalizedText(b.description) ||
      b.buttons?.length ||
      b.customNode,
  );

  if (!visibleBlocks.length) return null;

  return (
    <div className="space-y-3">
      {visibleBlocks.map((block, index) => {
        const gradientStyle = getColorGradient(block.svgIconColor || 'cyan', isLight);

        return (
          <div
            key={index}
            className={`rounded-2xl border p-4 sm:p-5 ${
              isLight
                ? 'border-dark-700/60 bg-white/80 shadow-sm'
                : 'border-dark-700/50 bg-dark-800/50'
            }`}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <ThemeIcon
                getSvgHtml={getSvgHtml}
                svgIconKey={block.svgIconKey}
                gradientStyle={gradientStyle}
                isMobile={isMobile}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-dark-100">{getLocalizedText(block.title)}</h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-dark-400">
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
