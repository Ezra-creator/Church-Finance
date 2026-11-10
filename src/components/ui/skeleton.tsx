import React from "react";
import { clsx } from "clsx";

export interface SkeletonProps {
  className?: string;
  height?: number | string;
  width?: number | string;
}

export function Skeleton({ className, height, width }: SkeletonProps) {
  return (
    <div
      className={clsx("bg-hover rounded-control", className)}
      style={{
        height: height ?? "14px",
        width: width ?? "100%",
      }}
      aria-hidden="true"
    />
  );
}

