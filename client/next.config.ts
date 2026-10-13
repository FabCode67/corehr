import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    // Public job applications upload several documents (up to 5 MB each)
    // through a Server Action; the 1 MB default would reject them.
    serverActions: { bodySizeLimit: "30mb" },
  },
}

export default nextConfig
