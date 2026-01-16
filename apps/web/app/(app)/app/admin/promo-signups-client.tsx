"use client";

import { useState, useEffect, useCallback } from "react";

interface PromoSignup {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  yearsExperience: string;
  status: string;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  pending: number;
  activated: number;
  expired: number;
  byExperience: {
    "5-7": number;
    "8-10": number;
    "11-15": number;
    "15+": number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function PromoSignupsClient() {
  const [signups, setSignups] = useState<PromoSignup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [experienceFilter, setExperienceFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSignups = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      if (statusFilter) params.set("status", statusFilter);
      if (experienceFilter) params.set("experience", experienceFilter);
      
      const res = await fetch(`/api/admin/promo-signups?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch signups");
      }
      
      const data = await res.json();
      setSignups(data.signups);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signups");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, experienceFilter]);

  useEffect(() => {
    fetchSignups();
  }, [fetchSignups]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/promo-signups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      
      // Refresh data
      fetchSignups();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this signup?")) return;
    
    try {
      const res = await fetch(`/api/admin/promo-signups/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete signup");
      }
      
      // Refresh data
      fetchSignups();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete signup");
    }
  };

  const exportCSV = () => {
    if (!signups.length) return;
    
    const headers = ["First Name", "Last Name", "Email", "Experience", "Status", "Signed Up", "Activated", "Expires"];
    const rows = signups.map(s => [
      s.firstName,
      s.lastName,
      s.email,
      s.yearsExperience,
      s.status,
      new Date(s.createdAt).toLocaleDateString(),
      s.activatedAt ? new Date(s.activatedAt).toLocaleDateString() : "",
      s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "",
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promo-signups-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "ACTIVATED":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading && !signups.length) {
    return <div className="p-4 text-center text-gray-500">Loading promo signups...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Signups</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-green-600">{stats.activated}</div>
            <div className="text-sm text-gray-500">Activated</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
            <div className="text-sm text-gray-500">Expired</div>
          </div>
        </div>
      )}

      {/* Experience Breakdown */}
      {stats && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">By Experience Level</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-indigo-600">{stats.byExperience["5-7"]}</div>
              <div className="text-xs text-gray-500">5-7 years</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-600">{stats.byExperience["8-10"]}</div>
              <div className="text-xs text-gray-500">8-10 years</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-600">{stats.byExperience["11-15"]}</div>
              <div className="text-xs text-gray-500">11-15 years</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-600">{stats.byExperience["15+"]}</div>
              <div className="text-xs text-gray-500">15+ years</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Export */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVATED">Activated</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Experience:</label>
          <select
            value={experienceFilter}
            onChange={(e) => {
              setExperienceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All</option>
            <option value="5-7">5-7 years</option>
            <option value="8-10">8-10 years</option>
            <option value="11-15">11-15 years</option>
            <option value="15+">15+ years</option>
          </select>
        </div>
        
        <div className="ml-auto">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Signups Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signed Up
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {signups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No signups found
                  </td>
                </tr>
              ) : (
                signups.map((signup) => (
                  <tr key={signup.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {signup.firstName} {signup.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{signup.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{signup.yearsExperience} years</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(signup.status)}`}>
                        {signup.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(signup.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {signup.expiresAt ? new Date(signup.expiresAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        {signup.status === "PENDING" && (
                          <button
                            onClick={() => handleStatusChange(signup.id, "ACTIVATED")}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Activate
                          </button>
                        )}
                        {signup.status === "ACTIVATED" && (
                          <button
                            onClick={() => handleStatusChange(signup.id, "EXPIRED")}
                            className="text-gray-600 hover:text-gray-800 font-medium"
                          >
                            Expire
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(signup.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
