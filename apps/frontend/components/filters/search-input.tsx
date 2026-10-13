"use client";

import { forwardRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { value, onChange, id = "lead-search" },
  ref,
) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Label htmlFor={id} className="sr-only">
        Search leads by name or company (press / to focus)
      </Label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={ref}
        id={id}
        type="search"
        placeholder="Search name or company…  ( / )"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
        autoComplete="off"
      />
    </div>
  );
});
