import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "YiyoStudio";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          background: "linear-gradient(135deg, #0b1220 0%, #172554 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            opacity: 0.85,
            marginBottom: 18,
          }}
        >
          app.yiyo.studio
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          YiyoStudio
        </div>
        <div
          style={{
            fontSize: 36,
            maxWidth: 920,
            lineHeight: 1.25,
            opacity: 0.95,
          }}
        >
          Create, review, and approve AI-powered social content in one workflow.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
