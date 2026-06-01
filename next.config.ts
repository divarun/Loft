import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['topojson-client', 'd3-geo'],
}

export default config
