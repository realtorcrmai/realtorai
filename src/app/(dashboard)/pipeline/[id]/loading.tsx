import { LogoSpinner } from "@/components/brand/Logo";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: "calc(100vh - 120px)" }}>
      <LogoSpinner size={48} />
    </div>
  );
}

