"use client";
/* eslint-disable @next/next/no-img-element */

type WorkerAvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const getInitials = (name: string) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

export default function WorkerAvatar({
  name,
  imageUrl,
  size = "md",
  className = "",
}: WorkerAvatarProps) {
  return (
    <span className={`worker-avatar worker-avatar--${size} ${className}`.trim()} aria-hidden="true">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="worker-avatar__image" />
      ) : (
        <span className="worker-avatar__fallback">{getInitials(name)}</span>
      )}
    </span>
  );
}
