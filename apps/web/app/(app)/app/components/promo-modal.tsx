"use client";

import { useState } from "react";
import { XIcon } from "../../../../lib/icons";

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EXPERIENCE_OPTIONS = [
  { value: "", label: "Select experience" },
  { value: "5-7", label: "5-7 years" },
  { value: "8-10", label: "8-10 years" },
  { value: "11-15", label: "11-15 years" },
  { value: "15+", label: "15+ years" },
];

export function PromoModal({ isOpen, onClose, onSuccess }: PromoModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    yearsExperience: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/promo-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("This email has already been registered for the promotion.");
        } else if (data.details && Array.isArray(data.details)) {
          setError(data.details.join(", "));
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }

      // Success!
      setIsSuccess(true);
      localStorage.setItem("promo_signup_completed", "true");
      onSuccess?.();

      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>

          {/* Decorative Gradient */}
          <div className="absolute top-0 left-0 w-full h-44 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-10" />

          {/* Content */}
          <div className="relative p-8">
            {isSuccess ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  You&apos;re In!
                </h3>
                <p className="text-gray-600">
                  Check your email for next steps to activate your free 3 months
                  of Luke UX.
                </p>
              </div>
            ) : (
              /* Form State */
              <>
                {/* Badge */}
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
                  Limited Offer
                </span>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  3 months of Luke UX for free
                </h2>

                {/* Description */}
                <p className="text-gray-600 mb-6">
                  We&apos;re giving 50 Senior UX Designers free access just for
                  providing feedback on your experience.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* First Name */}
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Enter your first name"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Enter your last name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="you@example.com"
                    />
                  </div>

                  {/* Years of Experience */}
                  <div>
                    <label
                      htmlFor="yearsExperience"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Years of UX Experience
                    </label>
                    <select
                      id="yearsExperience"
                      name="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    >
                      {EXPERIENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 text-black uppercase font-black rounded-[18px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "var(--brand-yellow, #ffd526)",
                      boxShadow: "0px 6px 0px #111111",
                    }}
                    onMouseDown={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.boxShadow = "0px 2px 0px #111";
                        e.currentTarget.style.transform = "translateY(4px)";
                      }
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.boxShadow = "0px 6px 0px #111";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0px 6px 0px #111";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.boxShadow = "0px 4px 0px #111";
                        e.currentTarget.style.transform = "translateY(2px)";
                      }
                    }}
                  >
                    {isSubmitting ? "SUBMITTING..." : "CLAIM YOUR FREE ACCESS"}
                  </button>

                  {/* Terms */}
                  <p className="text-xs text-gray-500 text-center mt-4">
                    By submitting, you agree to our{" "}
                    <a href="/app/privacy" className="underline hover:text-gray-700">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/app/privacy" className="underline hover:text-gray-700">
                      Privacy Policy
                    </a>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
