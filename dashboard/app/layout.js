import "./globals.css";

export const metadata = {
  title: "PhysioFlow",
  description: "Realtime Rehab Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
