import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>PhysioFlow</h1>
      <p style={{ marginTop: 0, opacity: 0.7 }}>
        Go to the dashboard to see live charts.
      </p>
      <Link href="/dashboard">Open Dashboard →</Link>
    </main>
  );
}
