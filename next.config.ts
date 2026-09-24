import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const nextConfig: NextConfig = {
  // Allow host-mode previews on this machine's addresses, not arbitrary origins.
  allowedDevOrigins:
    process.env.NODE_ENV === "development"
      ? Object.values(networkInterfaces()).flatMap((entries) =>
          (entries ?? [])
            .filter((entry) => entry.family === "IPv4")
            .map((entry) => entry.address),
        )
      : [],
};

export default nextConfig;
