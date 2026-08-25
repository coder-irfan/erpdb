export async function POST() {
  return Response.json(
    { success: false, error: 'This demo login endpoint is disabled.', code: 'ENDPOINT_DISABLED' },
    { status: 404 }
  )
}
