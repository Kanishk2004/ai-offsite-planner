import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdfkit as an external server dependency and include AFM data files
  // so built-in fonts (like Helvetica) work in deployed Route Handlers.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pdfkit/js/data/*.afm"],
  },
};

export default nextConfig;
