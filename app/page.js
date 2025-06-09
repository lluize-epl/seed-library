// app/page.tsx

import Image from "next/image";
// import edisonLogo from "../public/edison-logo.png"; // Place your logo in /public
import seedLogo from "../public/seedLogo.jpeg"; // Place your logo in /public
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-around px-4">
      <div className="w-full max-w-lg flex flex-col items-center gap-12">
        <Image
          src={seedLogo}
          alt="Edison Public Library Logo"
          width={500}
          height={500}
          priority
          className="rounded-full"
        />
        <h1 className="text-4xl md:text-5xl font-bold text-green-dark text-center">
          Seed Library
        </h1>
        <div className="w-full flex flex-col gap-5 mt-6">
          <Link
            href="/register"
            className="w-full py-6 rounded-xl text-xl font-semibold bg-black text-white shadow-md focus:outline-none focus:ring-2 focus:ring-black transition text-center block hover:scale-105 focus:ring-offset-2 "
            rel="noopener noreferrer"
            passHref
          >
            Start a new Application
          </Link>
          <Link
            href="/borrow"
            className="w-full py-6 rounded-xl text-xl font-semibold bg-white text-green-dark border-2 border-green-medium shadow-md focus:outline-none focus:ring-2 focus:ring-black transition text-center block hover:scale-105 focus:ring-offset-2 "
            passHref
          >
            Borrow more seeds
          </Link>
          <Link
            href="/borrow"
            className="w-full py-6 rounded-xl text-xl font-semibold bg-black text-white border-2 border-green-medium shadow-md focus:outline-none focus:ring-2 focus:ring-black transition text-center block hover:scale-105 focus:ring-offset-2 "
            passHref
            disabled
          >
            Donate Seeds
          </Link>
        </div>
      </div>
    </main>
  );
}
