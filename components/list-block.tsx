import type { ReactNode } from "react";

export function ListBlock<T>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <ul className="list-inside list-disc space-y-1 text-sm leading-6">
      {items.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
