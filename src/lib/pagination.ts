export function getPageNumbers(
  page: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const delta = 1;
  const range: number[] = [];
  const result: (number | "ellipsis")[] = [];
  let prev: number | undefined;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (prev !== undefined) {
      if (i - prev === 2) {
        result.push(prev + 1);
      } else if (i - prev > 2) {
        result.push("ellipsis");
      }
    }
    result.push(i);
    prev = i;
  }

  return result;
}

export function getPaginationRange(
  page: number,
  pageSize: number,
  total: number
): { start: number; end: number } {
  if (total === 0) return { start: 0, end: 0 };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return { start, end };
}
