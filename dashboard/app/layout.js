export const metadata = {
  title: "PhysioFlow Dashboard",
  description: "Realtime rehab telemetry"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui" }}>
        {children}
      </body>
    </html>
  );
}
