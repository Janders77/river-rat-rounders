import { createClient } from "@base44/sdk";
import { localClient } from "@/api/localClient";
import { appParams } from "@/lib/app-params";

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const shouldUseLocalApi =
  (import.meta.env.VITE_USE_LOCAL_API || "true") === "true";

export const base44 = shouldUseLocalApi
  ? localClient
  : createClient({
      appId,
      token,
      functionsVersion,
      appBaseUrl,
      requiresAuth: true,
    });
