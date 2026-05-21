"use client";
import { useState } from "react";

// Logo/avatar that falls back to the first letter if the image is missing OR fails to load
export default function Avatar({ src, label }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-brand-red">
      {(label || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}
