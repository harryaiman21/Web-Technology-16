import Navbar from "./components/navbar"; // Import it here
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar /> {/* It lives here now! */}
        {children} {/* This is where your pages (Home, Login, etc.) load */}
      </body>
    </html>
  );
}