import { getColorGradientSolid } from '@/utils/colorParser';
import { ThemeIcon } from './ThemeIcon';
import type { BlockRendererProps } from './types';

export function TimelineBlock({
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
    <div className="space-y-0">
      {visibleBlocks.map((block, index) => {
        const gradientStyle = getColorGradientSolid(block.svgIconColor || 'cyan', isLight);
        const isLast = index === visibleBlocks.length - 1;

        return (
          <div key={index} className="flex gap-3 sm:gap-4">
            {/* Left column: bullet + line segment */}
            <div className="flex flex-col items-center">
              <ThemeIcon
                getSvgHtml={getSvgHtml}
                svgIconKey={block.svgIconKey}
                gradientStyle={gradientStyle}
                isMobile={isMobile}
              />
              {!isLast && (
                <div className={`w-0.5 flex-1 ${isLight ? 'bg-dark-700/40' : 'bg-dark-700'}`} />
              )}
            </div>
            {/* Right column: content */}
            <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-6'}`}>
              <h3 className="font-semibold text-dark-100">{getLocalizedText(block.title)}</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-dark-400">
                {getLocalizedText(block.description)}
              </p>
              {renderBlockButtons(block.buttons, 'light')}
              {block.customNode}
            </div>
          </div>
        );
      })}
    </div>
  );
}
