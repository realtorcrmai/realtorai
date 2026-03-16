"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ContentStepper,
  PromptsStep,
  GenerateStep,
  GalleryStep,
} from "@/components/content";
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  User,
} from "lucide-react";
import type { Prompt, MediaAsset } from "@/types";

interface ContentDetailProps {
  listing: {
    id: string;
    address: string;
    list_price: number | null;
    hero_image_url: string | null;
    status: string;
  };
  sellerName: string | null;
  initialPrompt: Prompt | null;
  initialAssets: MediaAsset[];
}

export function ContentDetail({
  listing,
  sellerName,
  initialPrompt,
  initialAssets,
}: ContentDetailProps) {
  const [currentStep, setCurrentStep] = useState(
    initialPrompt ? (initialAssets.length > 0 ? 3 : 2) : 1
  );
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button + Header */}
        <div className="animate-float-in">
          <Link
            href="/content"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Content Engine
          </Link>

          <div className="glass rounded-xl p-5 elevation-2">
            <div className="flex items-center gap-4">
              {/* Hero image */}
              <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0">
                {listing.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.hero_image_url}
                    alt={listing.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Listing info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {listing.address}
                </h1>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {sellerName && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {sellerName}
                    </span>
                  )}
                  {listing.list_price && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />$
                      {listing.list_price.toLocaleString("en-CA")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {listing.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="animate-float-in" style={{ animationDelay: "80ms" }}>
          <ContentStepper
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* Step Content */}
        <div style={{ animationDelay: "160ms" }}>
          {currentStep === 1 && (
            <PromptsStep
              listingId={listing.id}
              prompt={initialPrompt}
              onGenerated={handleRefresh}
            />
          )}
          {currentStep === 2 && (
            <GenerateStep
              listingId={listing.id}
              prompt={initialPrompt}
              assets={initialAssets}
              onGenerated={handleRefresh}
            />
          )}
          {currentStep === 3 && (
            <GalleryStep assets={initialAssets} />
          )}
        </div>
      </div>
    </div>
  );
}
