"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Navbar() {
  const router = useRouter();

  function logout() {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.clear();
    router.push("/login");
  }

  return (
    <nav className="bg-red-600 text-white w-64 min-h-screen flex flex-col shadow-lg flex-shrink-0">
      <div
        className="cursor-pointer flex flex-col items-center gap-3 p-6 border-b border-red-500 hover:bg-red-700 transition-colors"
        onClick={() => router.push("/dashboard")}
      >
        <Image
          src="/dhl-logo.png"
          alt="DHL"
          width={100}
          height={40}
          className="object-contain"
        />
        <span className="font-bold text-lg tracking-wide text-center">Knowledge Base</span>
      </div>
      <div className="flex flex-col gap-2 p-4 flex-1">
        <Button
          variant="ghost"
          className="text-white hover:bg-red-700 justify-start w-full font-medium"
          onClick={() => router.push("/dashboard")}
        >
          Dashboard
        </Button>
        <Button
          variant="ghost"
          className="text-white hover:bg-red-700 justify-start w-full font-medium"
          onClick={() => router.push("/upload")}
        >
          Upload
        </Button>
        <Button
          variant="ghost"
          className="text-white hover:bg-red-700 justify-start w-full font-medium"
          onClick={() => router.push("/logs")}
        >
          Logs
        </Button>
      </div>
      <div className="p-4 border-t border-red-500">
        <Button
          variant="outline"
          className="w-full text-white border-white/30 bg-white/10 hover:bg-white/20 font-medium"
          onClick={logout}
        >
          Logout
        </Button>
      </div>
    </nav>
  );
}
