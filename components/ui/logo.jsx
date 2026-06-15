import Link from "next/link";

export default function Logo() {
  return (
    <Link
      href="/"
      aria-label="Nexus Home"
      className="
        group
        flex
        items-center
        gap-3
        select-none
      "
    >
      {/* Logo Icon */}
      <div
        className="
          relative
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-2xl
          bg-gradient-to-br
          from-indigo-600
          via-blue-500
          to-emerald-500
          shadow-lg
          shadow-indigo-500/20
          transition-transform
          duration-300
          group-hover:scale-105
        "
      >
        <svg
          viewBox="0 0 32 32"
          className="h-7 w-7"
          fill="none"
        >
          {/* Connected nodes */}
          <circle
            cx="8"
            cy="8"
            r="3"
            fill="white"
            opacity="0.95"
          />

          <circle
            cx="24"
            cy="8"
            r="3"
            fill="white"
            opacity="0.95"
          />

          <circle
            cx="16"
            cy="24"
            r="3"
            fill="white"
            opacity="0.95"
          />

          {/* Connections */}
          <path
            d="M10.5 9.5L14.5 20"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />

          <path
            d="M21.5 9.5L17.5 20"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />

          <path
            d="M11 8H21"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>

        {/* Glow */}
        <div
          className="
            absolute
            inset-0
            rounded-2xl
            bg-white/10
            blur-xl
          "
        />
      </div>

      {/* Text */}
      <div className="flex flex-col leading-none">
        <span
          className="
            text-2xl
            font-extrabold
            tracking-tight
            text-slate-900
            transition-colors
            duration-300
            dark:text-white
          "
        >
          Nexus
        </span>

        <span
          className="
            text-[11px]
            font-medium
            uppercase
            tracking-[0.18em]
            text-slate-500
          "
        >
          AI Interview Platform
        </span>
      </div>
    </Link>
  );
}