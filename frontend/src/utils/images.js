/** Приводит путь к изображению блюда к URL, доступному через /static */
export function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null;

  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/static/")) {
    // Файлы лежат в static/image/, а в БД часто указан static/menu/
    if (trimmed.startsWith("/static/menu/")) {
      return `/static/image/${trimmed.slice("/static/menu/".length)}`;
    }
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `/static/image/${trimmed.replace(/^\/+/, "")}`;
}
