// apps/mobile/src/api/config.ts
// Override EXPO_PUBLIC_API_URL at build time for local dev or staging.
// Production points at the EC2 instance; NGINX proxies into NestJS on port 3000.
export const API_BASE =
  (process.env.EXPO_PUBLIC_API_URL ?? "https://api.tabup.cslade.space") + "/api/v1";

export const EAS_PROJECT_ID = "630711da-097f-4202-808a-521490cfb586";
