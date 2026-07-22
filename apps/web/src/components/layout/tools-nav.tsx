"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TOOLS_NAV = [
  { label: "Simulator", href: "/simulator" },
  { label: "Directory", href: "/hubs" },
] as const;

export function ToolsNav({ className }: { className?: string }) {
  return (
    <nav className={cn("hidden items-center sm:flex", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="lg" className="text-base!">
              Tools
              <ChevronDown data-icon="inline-end" className="opacity-50" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {TOOLS_NAV.map((item) => (
            <DropdownMenuLinkItem
              key={item.href}
              closeOnClick
              className="h-8"
              render={<Link href={item.href} />}
            >
              {item.label}
            </DropdownMenuLinkItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
