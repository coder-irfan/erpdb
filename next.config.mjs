/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.BASEPATH,
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
