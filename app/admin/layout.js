// /app/admin/layout.js
"use client"; // If using client-side navigation state
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UsersIcon,
  BuildingLibraryIcon, // For Branches
  Cog6ToothIcon,
  HomeIcon, // Link back to main app landing page
} from "@heroicons/react/24/outline"; // Or /24/solid for filled icons
import eplLogo from "../../public/eplLogoOnly.png";
import Image from "next/image";
import { RiSeedlingLine } from "react-icons/ri";
import { MdOutlineInventory } from "react-icons/md";

const navigationItems = [
  {
    name: "User Stats",
    href: "/admin/user-stats",
    icon: UsersIcon,
    current: true,
  }, // Default page
  { name: "Seed Stats", href: "/admin/seed-stats", icon: RiSeedlingLine }, // Or use a more specific seed icon
  { name: "Inventory", href: "/admin/inventory", icon: MdOutlineInventory },
  {
    name: "Branch Stats",
    href: "/admin/branch-stats",
    icon: BuildingLibraryIcon,
  },
];

const bottomNavigationItems = [
  { name: "Settings", href: "/admin/settings", icon: Cog6ToothIcon },
  { name: "Public Site", href: "/", icon: HomeIcon }, // Link to user-facing site
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-100 font-geist-sans">
      {/* Sidebar */}
      <div className="w-20 flex-shrink-0 bg-slate-800 text-slate-300 flex flex-col items-center py-6 space-y-6">
        <Link href="/admin">
          <Image
            src={eplLogo}
            alt="logo"
            width={50}
            height={50}
            className="rounded"
          />
        </Link>

        {/* Main Navigation */}
        <nav className="flex-grow flex flex-col items-center space-y-4">
          {navigationItems.map((item) => (
            <Link key={item.name} href={item.href} legacyBehavior>
              <a
                title={item.name} // Tooltip for icon-only
                className={classNames(
                  pathname === item.href ||
                    (item.href === "/admin" &&
                      pathname.startsWith("/admin/") &&
                      !navigationItems
                        .slice(1)
                        .find((i) => pathname.startsWith(i.href)))
                    ? "bg-slate-900 text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-white",
                  "group flex flex-col items-center p-3 rounded-lg transition-colors duration-150"
                )}
              >
                <item.icon className="h-7 w-7" aria-hidden="true" />
                <span className="mt-1 text-xs">
                  {/* Optional: {item.name} */}
                </span>
              </a>
            </Link>
          ))}
        </nav>

        {/* Bottom Navigation (Settings, Back to Site) */}
        <div className="flex flex-col items-center space-y-4">
          {bottomNavigationItems.map((item) => (
            <Link key={item.name} href={item.href} legacyBehavior>
              <a
                title={item.name}
                className={classNames(
                  pathname === item.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-white",
                  "group flex flex-col items-center p-3 rounded-lg transition-colors duration-150"
                )}
              >
                <item.icon className="h-7 w-7" aria-hidden="true" />
              </a>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</div>
    </div>
  );
}
