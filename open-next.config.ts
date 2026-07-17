import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  dangerous: {
    buildConfig: {
      external: ["pg-cloudflare", "expo-sqlite", "fs", "path", "os", "pg"],
      minify: false,
    },
  },
} as any);
