"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";

interface SoldProperty {
  address: string;
  sold_price: number;
  sold_date: string;
  days_on_market: number;
  price_per_sqft: number;
  sqft: number;
}

export function NeighborhoodButton({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SoldProperty[] | null>(null);

  // Try to extract postal code from address
  const postalMatch = address.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i);

  async function handleSearch() {
    const code = postalCode || postalMatch?.[0] || "";
    if (!code) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/neighborhood?postalCode=${encodeURIComponent(code)}`
      );
      const data = await res.json();
      setResults(data.recentSales);
    } catch {
      console.error("Failed to fetch neighborhood data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Recent Sales
          </Button>
        }
      />
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recent Neighborhood Sales</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={postalCode || postalMatch?.[0] || ""}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="V3T 1A1"
            />
          </div>
          <Button onClick={handleSearch} className="self-end" disabled={loading}>
            {loading ? (
              <LogoSpinner size={16} />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {results && (
          <div className="space-y-3 mt-4">
            {results.map((prop, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-muted/50 space-y-1"
              >
                <p className="text-sm font-medium">{prop.address}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Sold:{" "}
                    {prop.sold_price.toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span>Date: {prop.sold_date}</span>
                  <span>DOM: {prop.days_on_market} days</span>
                  <span>$/sqft: ${prop.price_per_sqft}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
