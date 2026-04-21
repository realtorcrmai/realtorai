"use client";

import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useState } from "react";

const BASEMENT_OPTIONS = ["None", "Finished", "Unfinished", "Partial", "Crawl Space"];
const HEATING_OPTIONS = ["Forced Air", "Radiant", "Baseboard", "Heat Pump", "Boiler", "Other"];
const COOLING_OPTIONS = ["Central AC", "Mini Split", "Window Unit", "None", "Other"];
const ROOF_OPTIONS = ["Asphalt Shingle", "Metal", "Tile", "Flat/Membrane", "Cedar Shake", "Other"];
const EXTERIOR_OPTIONS = ["Vinyl Siding", "Wood", "Stucco", "Brick", "Stone", "Fiber Cement", "Other"];

interface PropertyDetailsStepProps {
  data: {
    bedrooms: string;
    bathrooms: string;
    total_sqft: string;
    finished_sqft: string;
    lot_sqft: string;
    year_built: string;
    parking_spaces: string;
    stories: string;
    basement_type: string;
    heating_type: string;
    cooling_type: string;
    roof_type: string;
    exterior_type: string;
    flooring: string[];
    features: string[];
  };
  onChange: (field: string, value: string | string[]) => void;
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function TagInput({ label, tags, onChange, placeholder }: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addTag() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  }

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-full">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="h-10 text-sm flex-1"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!input.trim()}
          className="px-3 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function PropertyDetailsStep({ data, onChange }: PropertyDetailsStepProps) {
  return (
    <div className="space-y-6">
      {/* Key specs */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Key Specifications</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bedrooms <span className="text-red-400">*</span></label>
            <Input
              type="number"
              min="0"
              value={data.bedrooms}
              onChange={(e) => onChange("bedrooms", e.target.value)}
              placeholder="3"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bathrooms <span className="text-red-400">*</span></label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={data.bathrooms}
              onChange={(e) => onChange("bathrooms", e.target.value)}
              placeholder="2.5"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Total Sq Ft <span className="text-red-400">*</span></label>
            <Input
              type="number"
              min="0"
              value={data.total_sqft}
              onChange={(e) => onChange("total_sqft", e.target.value)}
              placeholder="2,400"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Finished Sq Ft</label>
            <Input
              type="number"
              min="0"
              value={data.finished_sqft}
              onChange={(e) => onChange("finished_sqft", e.target.value)}
              placeholder="2,000"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Lot Sq Ft</label>
            <Input
              type="number"
              min="0"
              value={data.lot_sqft}
              onChange={(e) => onChange("lot_sqft", e.target.value)}
              placeholder="6,000"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Year Built</label>
            <Input
              type="number"
              min="1800"
              max="2030"
              value={data.year_built}
              onChange={(e) => onChange("year_built", e.target.value)}
              placeholder="2005"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Parking Spaces</label>
            <Input
              type="number"
              min="0"
              value={data.parking_spaces}
              onChange={(e) => onChange("parking_spaces", e.target.value)}
              placeholder="2"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Stories</label>
            <Input
              type="number"
              min="1"
              value={data.stories}
              onChange={(e) => onChange("stories", e.target.value)}
              placeholder="2"
              className="h-11 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Construction details */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Construction & Systems</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField label="Basement" value={data.basement_type} onChange={(v) => onChange("basement_type", v)} options={BASEMENT_OPTIONS} />
          <SelectField label="Heating" value={data.heating_type} onChange={(v) => onChange("heating_type", v)} options={HEATING_OPTIONS} />
          <SelectField label="Cooling" value={data.cooling_type} onChange={(v) => onChange("cooling_type", v)} options={COOLING_OPTIONS} />
          <SelectField label="Roof" value={data.roof_type} onChange={(v) => onChange("roof_type", v)} options={ROOF_OPTIONS} />
          <SelectField label="Exterior" value={data.exterior_type} onChange={(v) => onChange("exterior_type", v)} options={EXTERIOR_OPTIONS} />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <TagInput
          label="Flooring"
          tags={data.flooring}
          onChange={(v) => onChange("flooring", v)}
          placeholder="e.g. Hardwood, Tile, Carpet"
        />
        <TagInput
          label="Features"
          tags={data.features}
          onChange={(v) => onChange("features", v)}
          placeholder="e.g. Central Vacuum, Smart Home, Pool"
        />
      </div>
    </div>
  );
}
