import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Left column – branding */}
        <div className="relative flex flex-col justify-between bg-white px-8 py-10 lg:px-14">
          <div className="space-y-6">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/lukeux-logo.svg"
                alt="Luke UX"
                width={200}
                height={48}
                className="h-12 w-auto"
                priority
              />
            </Link>
            <p className="max-w-xl text-lg leading-relaxed text-slate-800">
              <b>Before work ships.</b> Luke UX makes your thinking clearer,
              your blind spots louder, and your standards impossible to ignore.
            </p>
            <div className="relative mt-8 flex justify-center">
              <div className="relative h-96 w-80">
                <Image
                  src="/images/luke-main.png"
                  alt="Luke UX superhero dog illustration"
                  fill
                  sizes="320px"
                  className="object-contain drop-shadow-lg"
                  priority
                />
              </div>
            </div>
            <div className="mt-6">
              <p className="text-lg leading-relaxed text-slate-700">
                <strong>Luke is a guard dog for design quality.</strong> He
                protects UX designers from bad assumptions, unclear flows, and
                production issues.
              </p>
            </div>
          </div>

          {/* Footer links */}
          <div className="hidden w-full flex-wrap items-center justify-between gap-4 text-xs text-slate-600 lg:flex mt-[50px]">
            {["About", "Features", "Pricing", "FAQ", "Contact", "Terms of Use", "Privacy"].map(
              (label) => (
                <Link
                  key={label}
                  href="/"
                  className="underline-offset-4 hover:underline"
                >
                  {label}
                </Link>
              )
            )}
          </div>
        </div>

        {/* Right column – form area */}
        <div className="flex items-start justify-center bg-[#f3f4f6] px-6 pt-8 pb-12 lg:pt-10">
          <div className="w-full max-w-lg rounded-[26px] px-8 pb-10 pt-8 min-h-[520px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
