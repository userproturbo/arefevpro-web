"use client";

type DotsIndicatorProps = {
  count: number;
  current: number;
};

export function DotsIndicator({ count, current }: DotsIndicatorProps) {
  return (
    <div className="dots-indicator" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className={index === current ? "dot active" : "dot"} />
      ))}
    </div>
  );
}
