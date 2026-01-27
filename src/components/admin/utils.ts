// Format setting key from Snake_Case / CamelCase to readable text
export function formatSettingKey(name: string): string {
  if (!name) return '';

  return (
    name
      // CamelCase -> spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // snake_case -> spaces
      .replace(/_/g, ' ')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim()
      // Capitalize first letter
      .replace(/^./, (c) => c.toUpperCase())
  );
}

// Strip HTML tags and template descriptions from setting descriptions
export function stripHtml(html: string): string {
  if (!html) return '';
  const cleaned = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();

  // Remove template descriptions like "Параметр X управляет категорией Y"
  if (cleaned.match(/^Параметр .+ управляет категорией/)) {
    return '';
  }

  return cleaned;
}
