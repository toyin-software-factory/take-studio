import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@take-studio/db"],
  serverExternalPackages: ["pg", "pg-boss"],
};

export default config;
