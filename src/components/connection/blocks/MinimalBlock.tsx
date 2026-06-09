import { getColorGradient } from '@/utils/colorParser';
import { ThemeIcon } from './ThemeIcon';
import type { BlockRendererProps } from './types';

export function MinimalBlock({
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
    <div>
      {visibleBlocks.map((block, index) => {
        const gradientStyle = getColorGradient(block.svgIconColor || 'cyan', isLight);
        const isLast = index === visibleBlocks.length - 1;

        return (
          <div
            key={index}
            className={
              isLast
                ? 'pb-4'
                : `mb-4 border-b pb-4 ${isLight ? 'border-dark-700/40' : 'border-dark-700/50'}`
            }
          >
            <div className="mb-2 flex items-center gap-3">
              <ThemeIcon
                getSvgHtml={getSvgHtml}
                svgIconKey={block.svgIconKey}
                gradientStyle={gradientStyle}
                isMobile={isMobile}
              />
              <span className="font-medium text-dark-100">{getLocalizedText(block.title)}</span>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-dark-400">
              {getLocalizedText(block.description)}
            </p>
            {renderBlockButtons(block.buttons, 'subtle')}
            {block.customNode}
          </div>
        );
      })}
    </div>
  );
}
