import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, CheckCircle2, LogIn, Loader2, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { getDuesStatus, createPaypalOrder, capturePaypalOrder } from "@/functions/dues";
import { loadPaypalSdk } from "@/lib/paypalSdk";

export default function PayMyDues() {
  const [player, setPlayer] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const buttonsRef = useRef(null);
  const buttonsRendered = useRef(false);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      if (!user || user.id === "guest-local-user") {
        setLoading(false);
        return;
      }
      setPlayer(user);
      try {
        setStatus(await getDuesStatus());
      } catch (err) {
        setError(err.message || "Could not load dues status.");
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!player || !status || status.paid || buttonsRendered.current) return;

    let cancelled = false;
    (async () => {
      try {
        const paypal = await loadPaypalSdk();
        if (cancelled || !buttonsRef.current) return;
        buttonsRendered.current = true;
        paypal
          .Buttons({
            style: { color: "black", shape: "rect", label: "pay" },
            createOrder: async () => {
              setError("");
              const { order_id } = await createPaypalOrder();
              return order_id;
            },
            onApprove: async (data) => {
              const result = await capturePaypalOrder(data.orderID);
              setStatus((prev) => ({ ...prev, paid: true, paid_at: result.paid_at }));
            },
            onError: (err) => {
              setError(err.message || "PayPal was unable to complete the payment.");
            },
          })
          .render(buttonsRef.current);
      } catch (err) {
        setError(err.message || "Could not load PayPal.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [player, status]);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)" }}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)" }} />
      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Pay My Dues</h1>
            <p className="text-base text-white/40 mt-0.5 leading-none">League membership payment</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-white/20" />
          </div>
        ) : !player ? (
          <div className="w-full rounded-xl border border-white/10 bg-white/5 p-6 text-center flex flex-col items-center gap-3">
            <LogIn className="w-10 h-10 text-white/20" />
            <p className="text-white/50 text-base">Sign in as a player on the home screen to pay your dues.</p>
            <Link
              to={createPageUrl("Home")}
              className="px-4 py-2 rounded-lg text-base font-semibold text-white transition-colors"
              style={{ background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              Go to Sign In
            </Link>
          </div>
        ) : status?.paid ? (
          <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center flex flex-col items-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-emerald-400 font-semibold text-base">Dues paid for {status.quarter}</p>
            <p className="text-white/40 text-base">You're all set until next quarter.</p>
          </div>
        ) : (
          <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-4">
            <p className="text-white/70 text-base">
              Dues for <span className="text-white font-semibold">{status?.quarter}</span> are{" "}
              <span className="text-white font-semibold">${status?.amount}</span>.
            </p>
            <div ref={buttonsRef} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-white/30 text-base whitespace-nowrap">or scan to pay on your phone</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={window.location.href} size={140} />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-base">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
