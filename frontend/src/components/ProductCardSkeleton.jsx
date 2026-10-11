export default function ProductCardSkeleton() {
  return (
    <div className="vyora-card overflow-hidden" style={{ '--shadow-hover':'none', pointerEvents:'none' }}>
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-2.5">
        <div className="h-2.5 skeleton rounded-full w-1/3" />
        <div className="h-3.5 skeleton rounded-full w-4/5" />
        <div className="h-3 skeleton rounded-full w-2/3" />
        <div className="h-3 skeleton rounded-full w-1/3" />
        <div className="h-4 skeleton rounded-full w-2/5 mt-1" />
        <div className="h-9 skeleton rounded-xl mt-2" />
      </div>
    </div>
  );
}
