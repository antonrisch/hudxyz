"use client";

import { useState } from "react";
import { Check, Copy, Glasses } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { useSimulatorState } from "@/components/simulator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SUGGESTED_APPS } from "@/lib/simulator/config";
import { dropFocus } from "@/lib/simulator/input";
import { buildDeviceSetupDeepLink, normalizeWebUrl } from "@/lib/simulator/search-params";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { cn } from "@/lib/utils";

function suggestedAppNameForUrl(rawUrl: string): string {
  const href = normalizeWebUrl(rawUrl);
  if (!href) return "";
  return SUGGESTED_APPS.find((app) => app.url === href)?.name ?? "";
}

export function OpenOnGlasses({ className }: { className?: string }) {
  const isMobile = useMobileLayout();
  const url = useSimulatorState((s) => s.url);
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [copied, setCopied] = useState(false);

  const deviceDeepLink = buildDeviceSetupDeepLink(appName, url);

  const copyLink = async () => {
    if (!deviceDeepLink) {
      toast.message("Enter an app name and URL first");
      return;
    }
    try {
      await navigator.clipboard.writeText(deviceDeepLink);
      setCopied(true);
      toast.message("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setAppName(suggestedAppNameForUrl(url));
          setCopied(false);
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="brand"
            size={isMobile ? "icon-lg" : "lg"}
            aria-label="Open on Glasses"
            onMouseDown={dropFocus}
            className={cn("shrink-0 font-semibold", className)}
          >
            <Glasses data-icon={isMobile ? undefined : "inline-start"} />
            {!isMobile ? <span>Open on Glasses</span> : null}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-4 p-3">
        <PopoverHeader>
          <PopoverTitle>Add to glasses</PopoverTitle>
          <PopoverDescription>
            Scan with your phone to open the Meta AI app and add this web app to your glasses.
          </PopoverDescription>
        </PopoverHeader>

        <div className="space-y-1.5">
          <Label htmlFor="glasses-app-name">App name</Label>
          <Input
            id="glasses-app-name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="My MRBD app"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {deviceDeepLink ? (
          <div className="flex justify-center rounded-lg border bg-white p-3">
            <QRCode
              value={deviceDeepLink}
              size={168}
              bgColor="#ffffff"
              fgColor="#000000"
              title={appName.trim()}
            />
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Enter an app name and load a URL to generate a setup QR code.
          </p>
        )}

        <div className="flex min-w-0 items-center gap-2">
          <Input
            readOnly
            value={deviceDeepLink ?? ""}
            placeholder="fb-viewapp://…"
            aria-label="Device setup link"
            className="min-w-0 font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!deviceDeepLink}
            aria-label={copied ? "Copied" : "Copy link"}
            onClick={() => void copyLink()}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
