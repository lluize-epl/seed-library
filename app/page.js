// app/page.tsx

import Image from "next/image";
import edisonLogo from "../public/edison-logo.png"; // Place your logo in /public
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-green-light flex flex-col items-center justify-around px-4">
      <div className="w-full max-w-md flex flex-col items-center gap-12">
        <Image
          src={edisonLogo}
          alt="Edison Public Library Logo"
          width={200}
          height={200}
          className="rounded-full"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-green-dark text-center">
          Seed Library
        </h1>
        <div className="w-full flex flex-col gap-4 mt-4">
          <Link
            href="https://app.nocodb.com/p/seedlibrarynew"
            passHref
            legacyBehavior
          >
            <a
              className="w-full py-6 rounded-xl text-xl font-semibold bg-black text-white shadow-md focus:outline-none focus:ring-2 focus:ring-green-dark transition text-center block"
              rel="noopener noreferrer"
            >
              Start a new Application
            </a>
          </Link>
          <Link href="/borrow" passHref legacyBehavior>
            <a className="w-full py-6 rounded-xl text-xl font-semibold bg-white text-green-dark border-2 border-green-medium shadow-md focus:outline-none focus:ring-2 focus:ring-green-dark transition text-center block">
              Borrow more seeds
            </a>
          </Link>
        </div>
      </div>
    </main>
  );
}
