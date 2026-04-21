"use client";

interface ReviewStepProps {
  address: string;
  propertyType: string;
  sellerName: string;
  lockboxCode: string;
  listPrice: string;
  mlsNumber: string;
  showingStart: string;
  showingEnd: string;
  notes: string;
  bedrooms: string;
  bathrooms: string;
  totalSqft: string;
  finishedSqft: string;
  lotSqft: string;
  yearBuilt: string;
  parkingSpaces: string;
  stories: string;
  basementType: string;
  heatingType: string;
  coolingType: string;
  roofType: string;
  exteriorType: string;
  flooring: string[];
  features: string[];
  fintracName: string;
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {children}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function ReviewStep(props: ReviewStepProps) {
  const priceDisplay = props.listPrice
    ? `$${parseInt(props.listPrice).toLocaleString()}`
    : undefined;

  const showingWindow = props.showingStart && props.showingEnd
    ? `${props.showingStart} – ${props.showingEnd}`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-brand/5 border border-brand/20 text-sm">
        <p className="font-semibold text-brand">Ready to create your listing</p>
        <p className="text-xs mt-1 text-muted-foreground">
          Review the details below. You can edit everything after creation.
        </p>
      </div>

      <ReviewSection title="Property">
        <ReviewItem label="Address" value={props.address} />
        <ReviewItem label="Type" value={props.propertyType} />
        <ReviewItem label="Seller" value={props.sellerName} />
        <ReviewItem label="Lockbox" value={props.lockboxCode} />
      </ReviewSection>

      {(props.bedrooms || props.bathrooms || props.totalSqft) && (
        <ReviewSection title="Property Details">
          <ReviewItem label="Bedrooms" value={props.bedrooms} />
          <ReviewItem label="Bathrooms" value={props.bathrooms} />
          <ReviewItem label="Total Sq Ft" value={props.totalSqft ? parseInt(props.totalSqft).toLocaleString() : undefined} />
          <ReviewItem label="Finished Sq Ft" value={props.finishedSqft ? parseInt(props.finishedSqft).toLocaleString() : undefined} />
          <ReviewItem label="Lot Sq Ft" value={props.lotSqft ? parseInt(props.lotSqft).toLocaleString() : undefined} />
          <ReviewItem label="Year Built" value={props.yearBuilt} />
          <ReviewItem label="Parking" value={props.parkingSpaces} />
          <ReviewItem label="Stories" value={props.stories} />
          <ReviewItem label="Basement" value={props.basementType} />
          <ReviewItem label="Heating" value={props.heatingType} />
          <ReviewItem label="Cooling" value={props.coolingType} />
          <ReviewItem label="Roof" value={props.roofType} />
          <ReviewItem label="Exterior" value={props.exteriorType} />
          {props.flooring.length > 0 && <ReviewItem label="Flooring" value={props.flooring.join(", ")} />}
          {props.features.length > 0 && <ReviewItem label="Features" value={props.features.join(", ")} />}
        </ReviewSection>
      )}

      <ReviewSection title="Pricing & Showing">
        <ReviewItem label="List Price" value={priceDisplay} />
        <ReviewItem label="MLS #" value={props.mlsNumber} />
        <ReviewItem label="Showing Window" value={showingWindow} />
        {props.notes && (
          <div className="col-span-2 text-sm">
            <span className="text-muted-foreground">Notes: </span>
            <span className="text-foreground italic">{props.notes}</span>
          </div>
        )}
      </ReviewSection>

      {props.fintracName && (
        <ReviewSection title="FINTRAC Identity">
          <ReviewItem label="Full Name" value={props.fintracName} />
          <div className="col-span-2 text-xs text-success font-medium">Seller identity will be saved for FINTRAC compliance</div>
        </ReviewSection>
      )}

      {!props.fintracName && (
        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/30 text-xs text-amber-700">
          FINTRAC identity not provided — you can add it later from the listing workflow.
        </div>
      )}
    </div>
  );
}
