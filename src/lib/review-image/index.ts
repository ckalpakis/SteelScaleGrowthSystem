// =============================================================================
// Personalized review image — shared types + pure helpers. Server-safe.
// =============================================================================

import { createElement, type ReactElement } from "react";

export type TextPosition = "top" | "center" | "bottom";

export interface ReviewImageConfig {
  enabled: boolean;
  baseImageUrl: string | null;
  baseImagePath: string | null;
  nameTemplate: string; // {name} replaced per recipient
  textColor: string;
  fontSize: number;
  textPosition: TextPosition;
}

/** The review-request stages that carry a personalized image (first two texts). */
export const IMAGE_EVENT_TYPES = ["review_request.initial", "review_request.follow_up_1"] as const;

/** Whether this send should attach a personalized image. */
export function shouldAttachImage(eventType: string, config: ReviewImageConfig | null): config is ReviewImageConfig {
  return Boolean(
    config &&
      config.enabled &&
      config.baseImageUrl &&
      (IMAGE_EVENT_TYPES as readonly string[]).includes(eventType),
  );
}

/** Substitute {name} in the template (case-insensitive). Falls back to the name. */
export function applyNameTemplate(template: string, name: string): string {
  const clean = (name ?? "").trim();
  const t = template && template.trim() ? template : "{name}";
  if (/\{name\}/i.test(t)) return t.replace(/\{name\}/gi, clean);
  return clean; // template had no placeholder — just show the name
}

/** Canvas size for the generated image (square is safe for MMS). */
export const IMAGE_WIDTH = 1080;
export const IMAGE_HEIGHT = 1080;

function verticalJustify(position: TextPosition): "flex-start" | "center" | "flex-end" {
  return position === "top" ? "flex-start" : position === "center" ? "center" : "flex-end";
}

/**
 * Build the Satori/next-og element: the base image covering the canvas with the
 * personalized text overlaid at the configured position. Uses createElement so
 * this stays a .ts file (no JSX in route handlers).
 */
export function buildReviewImageElement(params: {
  baseImageUrl: string;
  text: string;
  color: string;
  fontSize: number;
  position: TextPosition;
  width?: number;
  height?: number;
}): ReactElement {
  const width = params.width ?? IMAGE_WIDTH;
  const height = params.height ?? IMAGE_HEIGHT;

  return createElement(
    "div",
    {
      style: {
        position: "relative",
        display: "flex",
        width: `${width}px`,
        height: `${height}px`,
        alignItems: "center",
        justifyContent: verticalJustify(params.position),
        flexDirection: "column",
        backgroundColor: "#000000",
      },
    },
    // Base image, covering the canvas.
    createElement("img", {
      src: params.baseImageUrl,
      width,
      height,
      style: { position: "absolute", top: 0, left: 0, width: `${width}px`, height: `${height}px`, objectFit: "cover" },
    }),
    // Text overlay (with a soft shadow for legibility on any photo).
    createElement(
      "div",
      {
        style: {
          display: "flex",
          maxWidth: `${Math.round(width * 0.9)}px`,
          margin: "48px",
          padding: "16px 28px",
          color: params.color,
          fontSize: `${params.fontSize}px`,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.1,
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          backgroundColor: "rgba(0,0,0,0.28)",
          borderRadius: "18px",
        },
      },
      params.text,
    ),
  );
}
