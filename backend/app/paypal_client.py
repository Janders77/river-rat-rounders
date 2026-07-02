import os

import httpx

PAYPAL_API_BASE = os.environ.get("PAYPAL_API_BASE", "https://api-m.sandbox.paypal.com")
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")
PAYPAL_WEBHOOK_ID = os.environ.get("PAYPAL_WEBHOOK_ID", "")
DUES_AMOUNT = os.environ.get("DUES_AMOUNT", "25.00")
DUES_CURRENCY = os.environ.get("DUES_CURRENCY", "USD")


class PayPalError(Exception):
    pass


def _require_credentials():
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise PayPalError("PayPal is not configured (missing PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET)")


async def get_access_token() -> str:
    _require_credentials()
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        )
    if resp.status_code >= 400:
        raise PayPalError(f"PayPal auth failed: {resp.text}")
    return resp.json()["access_token"]


async def create_order(player_id: str, quarter: str) -> dict:
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "custom_id": player_id,
                        "description": f"River Rat Rounders dues — {quarter}",
                        "amount": {"currency_code": DUES_CURRENCY, "value": DUES_AMOUNT},
                    }
                ],
            },
        )
    if resp.status_code >= 400:
        raise PayPalError(f"PayPal order create failed: {resp.text}")
    return resp.json()


async def capture_order(order_id: str) -> dict:
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {token}"},
        )
    if resp.status_code >= 400:
        raise PayPalError(f"PayPal order capture failed: {resp.text}")
    return resp.json()


async def verify_webhook_signature(headers: dict, body: dict) -> bool:
    if not PAYPAL_WEBHOOK_ID:
        return False
    token = await get_access_token()
    payload = {
        "auth_algo": headers.get("paypal-auth-algo"),
        "cert_url": headers.get("paypal-cert-url"),
        "transmission_id": headers.get("paypal-transmission-id"),
        "transmission_sig": headers.get("paypal-transmission-sig"),
        "transmission_time": headers.get("paypal-transmission-time"),
        "webhook_id": PAYPAL_WEBHOOK_ID,
        "webhook_event": body,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )
    if resp.status_code >= 400:
        return False
    return resp.json().get("verification_status") == "SUCCESS"


def order_custom_id(order: dict) -> str | None:
    units = order.get("purchase_units") or []
    if not units:
        return None
    return units[0].get("custom_id") or (units[0].get("payments", {}).get("captures", [{}])[0].get("custom_id"))
