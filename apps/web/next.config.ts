import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@take-studio/db", "@take-studio/media"],
  serverExternalPackages: ["pg", "pg-boss"],
};

export default config;
