"use client";

import Image from "next/image";

type Props = {
  name: string;
  photoUrl?: string;
};

export function ContactAvatar({ name, photoUrl }: Props) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf2ff] text-sm font-semibold text-[#1b4c96] ring-2 ring-white shadow-sm">
      {initials || "C"}
    </div>
  );
}


