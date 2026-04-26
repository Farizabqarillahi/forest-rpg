export const metadata = {
  title: 'Forest Realm RPG',
  description: 'Pixel art top-down RPG — Next.js + Canvas + Supabase',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin:0, padding:0, overflow:'hidden', background:'#0a0a0a' }}>
        {children}
      </body>
    </html>
  );
}
