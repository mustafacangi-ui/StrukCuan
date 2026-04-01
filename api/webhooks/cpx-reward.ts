export const config = {
  runtime: "nodejs",
};

export async function GET() {
  return Response.json({
    success: true,
    message: "Webhook route works",
  });
}

export async function POST() {
  return Response.json({
    success: true,
    message: "Webhook route works",
  });
}
