import { parseBrandName } from '@/utils/brandName';

interface BrandNameProps {
  /** Имя с метками цвета: «berlin{#FF8A00}connection». */
  markup: string;
}

/** Имя бренда, где слова с меткой {#HEX} окрашены; остальное наследует цвет родителя. */
export function BrandName({ markup }: BrandNameProps) {
  return (
    <>
      {parseBrandName(markup).map((part, i) =>
        part.color ? (
          <span key={i} style={{ color: part.color }}>
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
