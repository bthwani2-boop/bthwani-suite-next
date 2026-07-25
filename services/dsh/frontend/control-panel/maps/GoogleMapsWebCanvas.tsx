"use client";

import React from "react";
import { CpStatePanel } from "@bthwani/control-panel/components";

export type GoogleMapsWebPoint = {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly title: string;
  readonly description?: string;
};

export type GoogleMapsWebPolygon = {
  readonly id: string;
  readonly label: string;
  readonly points: readonly (readonly [number, number])[];
  readonly active: boolean;
};

export type GoogleMapsWebCanvasProps = {
  readonly points?: readonly GoogleMapsWebPoint[];
  readonly polygons?: readonly GoogleMapsWebPolygon[];
  readonly height?: number;
  readonly onMapClick?: (coordinate: { readonly latitude: number; readonly longitude: number }) => void;
  readonly ariaLabel?: string;
};

type GoogleMapsRuntime = {
  readonly Map: new (element: HTMLElement, options: Record<string, unknown>) => {
    fitBounds(bounds: unknown, padding?: number): void;
    addListener(eventName: string, callback: (event: { latLng?: { lat(): number; lng(): number } }) => void): unknown;
  };
  readonly Marker: new (options: Record<string, unknown>) => unknown;
  readonly Polygon: new (options: Record<string, unknown>) => unknown;
  readonly LatLngBounds: new () => {
    extend(coordinate: { lat: number; lng: number }): void;
    isEmpty(): boolean;
  };
};

declare global {
  interface Window {
    google?: { readonly maps?: GoogleMapsRuntime };
    __bthwaniGoogleMapsPromise?: Promise<GoogleMapsRuntime>;
  }
}

function browserApiKey(): string | null {
  const value = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY?.trim();
  return value ? value : null;
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsRuntime> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  const existingPromise = window.__bthwaniGoogleMapsPromise;
  if (existingPromise) return existingPromise;

  const promise = new Promise<GoogleMapsRuntime>((resolve, reject) => {
    const callbackName = `__bthwaniGoogleMapsReady_${Date.now()}`;
    const runtimeWindow = window as unknown as Window & Record<string, unknown>;
    runtimeWindow[callbackName] = () => {
      delete runtimeWindow[callbackName];
      const runtime = window.google?.maps;
      if (!runtime) {
        reject(new Error("Google Maps runtime was not exposed after script load."));
        return;
      }
      resolve(runtime);
    };

    const script = document.createElement("script");
    script.id = "bthwani-google-maps-js";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=${callbackName}`;
    script.onerror = () => {
      delete runtimeWindow[callbackName];
      delete window.__bthwaniGoogleMapsPromise;
      reject(new Error("تعذر تحميل Google Maps JavaScript API."));
    };
    document.head.appendChild(script);
  });

  window.__bthwaniGoogleMapsPromise = promise;
  return promise;
}

function finiteCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export function GoogleMapsWebCanvas({
  points = [],
  polygons = [],
  height = 420,
  onMapClick,
  ariaLabel = "خريطة العمليات في بثواني",
}: GoogleMapsWebCanvasProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "missing-key" | "error">("loading");
  const [errorMessage, setErrorMessage] = React.useState<string>("");

  React.useEffect(() => {
    const apiKey = browserApiKey();
    if (!apiKey) {
      setState("missing-key");
      return;
    }
    if (!containerRef.current) return;

    let active = true;
    void loadGoogleMaps(apiKey).then((maps) => {
      if (!active || !containerRef.current) return;
      const map = new maps.Map(containerRef.current, {
        center: { lat: 15.3694, lng: 44.1910 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "greedy",
      });
      const bounds = new maps.LatLngBounds();

      for (const point of points) {
        if (!finiteCoordinate(point.latitude, point.longitude)) continue;
        const position = { lat: point.latitude, lng: point.longitude };
        bounds.extend(position);
        new maps.Marker({
          map,
          position,
          title: point.description ? `${point.title} · ${point.description}` : point.title,
        });
      }

      for (const polygon of polygons) {
        const polygonPath = polygon.points
          .filter(([longitude, latitude]) => finiteCoordinate(latitude, longitude))
          .map(([longitude, latitude]) => ({ lat: latitude, lng: longitude }));
        if (polygonPath.length < 3) continue;
        for (const coordinate of polygonPath) bounds.extend(coordinate);
        new maps.Polygon({
          map,
          paths: polygonPath,
          clickable: false,
          strokeOpacity: polygon.active ? 0.9 : 0.4,
          strokeWeight: 2,
          fillOpacity: polygon.active ? 0.18 : 0.06,
        });
      }

      if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
      if (onMapClick) {
        map.addListener("click", (event) => {
          const latLng = event.latLng;
          if (!latLng) return;
          onMapClick({ latitude: latLng.lat(), longitude: latLng.lng() });
        });
      }
      setState("ready");
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorMessage(error instanceof Error ? error.message : "تعذر تحميل الخريطة.");
      setState("error");
    });

    return () => {
      active = false;
    };
  }, [onMapClick, points, polygons]);

  if (state === "missing-key") {
    return (
      <CpStatePanel
        role="status"
        title="مفتاح خرائط لوحة التحكم غير مفعّل"
        description="أضف NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY ثم أعد تشغيل لوحة التحكم."
      />
    );
  }
  if (state === "error") {
    return <CpStatePanel role="alert" title="تعذر تحميل خريطة Google" description={errorMessage} />;
  }

  return (
    <div style={{ position: "relative", minHeight: height }} aria-label={ariaLabel}>
      {state === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل الخريطة…" /> : null}
      <div
        ref={containerRef}
        style={{ width: "100%", height, borderRadius: 16, overflow: "hidden" }}
      />
    </div>
  );
}
