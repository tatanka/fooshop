"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function StripeToast() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get("stripe") === "connected") {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-6 py-3 rounded-xl shadow-lg">
      Stripe collegato con successo!
    </div>
  );
}
