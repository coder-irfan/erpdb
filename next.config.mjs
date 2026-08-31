/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.BASEPATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.BASEPATH || ''
  },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    },
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/lab',
      'lucide-react',
      '@iconify/react',
      'apexcharts',
      'recharts',
      'date-fns',
      '@fullcalendar/react',
      '@tiptap/react'
    ]
  },
  redirects: async () => {
    return [
      {
        source: '/:lang(en|ps|fa)',
        destination: '/:lang/dashboard',
        permanent: true,
        locale: false
      },
      {
        source: '/:lang(en|ps|fa)/dashboards/analytics',
        destination: '/:lang/dashboard',
        permanent: true,
        locale: false
      },
      {
        source: '/:lang(en|ps|fa)/dashboards',
        destination: '/:lang/dashboard',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
