"use client";

import { useTransition } from "react";

type Props = {
  id: string;
  adminKey: string;
};

export default function AdminActions({ id, adminKey }: Props) {
  const [isPending, start] = useTransition();

  async function call(action: "confirm" | "cancel") {
    try {
      await fetch(`/api/bookings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminKey }),
      });
      // Next делает soft-refresh страницы (перерисует серверные куски)
      // без ручного router.refresh, т.к. мы используем revalidatePath в API.
      // Если хочешь форс-перерисовать: window.location.reload();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        className="btn btn-primary px-3 py-1.5"
        disabled={isPending}
        onClick={() => start(() => call("confirm"))}
      >
        Підтвердити
      </button>
      <button
        className="btn btn-outline px-3 py-1.5"
        disabled={isPending}
        onClick={() => start(() => call("cancel"))}
      >
        Скасувати
      </button>
    </div>
  );
}
