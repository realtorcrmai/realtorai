export default function Loading() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded" />
      <div className="h-4 w-72 bg-muted/60 rounded" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted/40 rounded-lg border border-border" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-48 bg-muted/40 rounded-lg border border-border" />
        <div className="h-48 bg-muted/40 rounded-lg border border-border" />
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/30 rounded-lg border border-border" />
        ))}
      </div>
    </div>
  );
}
