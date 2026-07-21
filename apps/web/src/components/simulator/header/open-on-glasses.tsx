"use client";

import { useState } from "react";
import { Glasses } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { CopyLinkRow } from "@/components/copy-link-row";
import { useSimulator, useSimulatorState } from "@/components/simulator";
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
import { track } from "@/lib/analytics/track";
import { readProxiedDocumentTitle } from "@/lib/simulator/app-load";
import type { SuggestedHub } from "@/lib/simulator/config";
import { dropFocus } from "@/lib/simulator/input";
import { buildDeviceSetupDeepLink, normalizeWebUrl } from "@/lib/simulator/search-params";
import { suggestedHubNameForUrl } from "@/lib/simulator/suggested-hubs";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { cn } from "@/lib/utils";

function hostnameLabel(rawUrl: string): string {
  const href = normalizeWebUrl(rawUrl);
  if (!href) return "";
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function resolveOpeningAppName(
  iframe: HTMLIFrameElement | null,
  url: string,
  suggestedHubs: SuggestedHub[],
): string {
  return (
    readProxiedDocumentTitle(iframe) ||
    suggestedHubNameForUrl(url, suggestedHubs) ||
    hostnameLabel(url)
  );
}

export function OpenOnGlasses({
  className,
  suggestedHubs,
}: {
  className?: string;
  suggestedHubs: SuggestedHub[];
}) {
  const isMobile = useMobileLayout();
  const { iframeRef } = useSimulator();
  const url = useSimulatorState((s) => s.url);
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const { copied, copy, resetCopied } = useCopyToClipboard();

  const deviceDeepLink = buildDeviceSetupDeepLink(appName, url);

  const copyLink = async () => {
    if (!deviceDeepLink) {
      toast.message("Enter an app name and URL first");
      return;
    }
    const has_url = Boolean(normalizeWebUrl(url));
    const ok = await copy(deviceDeepLink);
    track(ok ? "device_setup_link_copied" : "device_setup_link_copy_failed", { has_url });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          const prefilled = resolveOpeningAppName(iframeRef.current, url, suggestedHubs);
          setAppName(prefilled);
          resetCopied();
          track("open_on_glasses_opened", {
            has_url: Boolean(normalizeWebUrl(url)),
            app_name_prefilled: prefilled.length > 0,
          });
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

        <CopyLinkRow
          value={deviceDeepLink ?? ""}
          copied={copied}
          disabled={!deviceDeepLink}
          onCopy={() => void copyLink()}
          valueClassName="font-mono text-xs"
        />
      </PopoverContent>
    </Popover>
  );
}
