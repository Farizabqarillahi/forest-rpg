import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: 'Forest Realm RPG',
  description: 'A pixel art top-down RPG built with Canvas + Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#0a0a0a' }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}