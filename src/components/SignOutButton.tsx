// src/components/SignOutButton.tsx
"use client";
import { signOut } from "next-auth/react";

type Props = {
  className?: string;
};

export default function SignOutButton({ className }: Props) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className ?? "btn btn-ghost"}
    >
      Вийти
    </button>
  );
}
