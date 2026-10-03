import type { Metadata } from "next";
import "./ds.css";
import "./app.css";

export const metadata: Metadata = {
  title: "Kiln Studio — generative asset pipeline on Cloudinary",
  description:
    "Describe a campaign once. Kiln generates variations with a choice of AI model, tags them with AI Vision, and derives every channel size as a Cloudinary transformation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
