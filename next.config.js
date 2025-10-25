/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'bcryptjs',
      '@whiskeysockets/baileys',
      'ws',
      'pino',
      'qrcode'
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('_http_common')
    }
    return config
  }
}

module.exports = nextConfig