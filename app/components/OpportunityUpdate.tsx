import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

type OpportunityUpdateRow = {
  entityId: string | number | null;
  companyName: string;
  opportunity: string;
  salesPartner: string;
  touchpointDate: string;
  touchpointType: string;
  touchpointTitle: string;
};

type OpportunityDetail = {
  COMPANY?: string;
  OPPORTUNITY?: string;
  SALES_REPRESENTATIVE?: string;
  REFERRAL_PARTNER?: string;
  TOUCHPOINT_TYPE?: string;
  TOUCHPOINT_DATE?: string;
  TOUCHPOINT_SUBJECT?: string;
  DESCRIPTION?: string;
  STATUS?: string;
};

const detailApiUrl =
  "https://customapp.relayhumancloud.com/RHC-WebSiteAPI/GetOpportunityUpdateByEntityId";
const listApiUrl =
  "https://customapp.relayhumancloud.com/RHC-WebSiteAPI/GetOpportunityUpdate";

const detailContentBaseUrl = new URL(detailApiUrl).origin + "/";
const emptyDescriptionHtml = "<p>No description available.</p>";

const getOpportunityDescriptionSrcDoc = (description?: string) => {
  const html = description?.trim() || emptyDescriptionHtml;
  const fallbackHtml = `<!doctype html><html><head><base href="${detailContentBaseUrl}" target="_blank"></head><body>${html}</body></html>`;

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return fallbackHtml;
  }

  const document = new DOMParser().parseFromString(html, "text/html");

  document.querySelector("base")?.remove();

  const base = document.createElement("base");
  base.href = detailContentBaseUrl;
  base.target = "_blank";
  document.head.prepend(base);

  const style = document.createElement("style");
  style.textContent = `
    body {
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
      margin: 16px;
    }
    a {
      color: #3333ff;
      text-decoration: underline;
    }
    img {
      display: inline-block;
      height: auto;
      max-width: 100%;
    }
  `;
  document.head.append(style);

  document.querySelectorAll("a[href]").forEach((anchor) => {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  });

  document.querySelectorAll("img").forEach((image) => {
    const lazySrc =
      image.getAttribute("data-src") ||
      image.getAttribute("data-original") ||
      image.getAttribute("data-lazy-src");
    const lazySrcSet =
      image.getAttribute("data-srcset") ||
      image.getAttribute("data-lazy-srcset");

    if (!image.getAttribute("src") && lazySrc) {
      image.setAttribute("src", lazySrc);
    }

    if (!image.getAttribute("srcset") && lazySrcSet) {
      image.setAttribute("srcset", lazySrcSet);
    }

    image.setAttribute("loading", "eager");
  });

  return `<!doctype html>${document.documentElement.outerHTML}`;
};

const getOpportunityEntityId = (member: any) => {
  const directValue =
    member.entity_id ??
    member.entityId ??
    member.entityid ??
    member.ENTITY_ID ??
    member.EntityId ??
    member.EntityID ??
    member.entityID ??
    member.entity ??
    member.ENTITY ??
    member.Entity ??
    member.company_entity_id ??
    member.companyEntityId ??
    member.company_id ??
    member.companyId ??
    member.COMPANY_ID ??
    member.CompanyId ??
    member.COMPANY_ENTITY_ID ??
    member.OPPORTUNITY_ID ??
    member.opportunity_id ??
    member.opportunityId;

  if (directValue) {
    return directValue;
  }

  const idKey = Object.keys(member).find((key) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normalizedKey.includes("entity") && normalizedKey.includes("id");
  });

  return idKey ? member[idKey] : null;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token_partner");
  const userEmail = localStorage.getItem("valid_user_email");
  const company = localStorage.getItem("company");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    authemail: `Bearer ${userEmail}`,
  };

  if (company) {
    headers["company"] = company;
  }

  return headers;
};


export default function OpportunityUpdate() {
  const [updates, setUpdates] = useState<OpportunityUpdateRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const rowsPerPage = 10;
  const [rotatedId, setRotatedId] = useState<number | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [selectedUpdate, setSelectedUpdate] =
    useState<OpportunityUpdateRow | null>(null);
  const [detailItems, setDetailItems] = useState<OpportunityDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateSubmitError, setUpdateSubmitError] = useState("");
  const [updateSubmitSuccess, setUpdateSubmitSuccess] = useState("");

  const [updateModalOpportunity, setUpdateModalOpportunity] =
    useState<OpportunityUpdateRow | null>(null);

  const [updateForm, setUpdateForm] = useState({
    updateTitle: "",
    update: "",
  });

  const handleRowToggle = (_member: OpportunityUpdateRow, id: number) => {
    setRotatedId((prev) => (prev === id ? null : id));
  };

  const closeDetailModal = () => {
    setSelectedUpdate(null);
    setDetailItems([]);
    setDetailError("");
  };

  const handleTitleClick = async (member: OpportunityUpdateRow) => {
    setSelectedUpdate(member);
    setDetailItems([]);
    setDetailError("");

    if (!member.entityId) {
      setDetailError(
        "Entity id is missing from the opportunity update API response.",
      );
      return;
    }

    setDetailLoading(true);

    try {
      const response = await axios.get(
        `${detailApiUrl}?entityId=${encodeURIComponent(member.entityId)}`,
      );

      setDetailItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching opportunity update details:", error);
      setDetailError("Unable to load the content for this company.");
    } finally {
      setDetailLoading(false);
    }
  };

  const normalizeValue = (value?: string) => (value || "").trim().toLowerCase();

  const getSelectedDetailItems = () => {
    if (!selectedUpdate) {
      return [];
    }

    const exactMatches = detailItems.filter(
      (item) =>
        normalizeValue(item.TOUCHPOINT_SUBJECT) ===
          normalizeValue(selectedUpdate.touchpointTitle) &&
        normalizeValue(item.TOUCHPOINT_DATE) ===
          normalizeValue(selectedUpdate.touchpointDate) &&
        normalizeValue(item.TOUCHPOINT_TYPE) ===
          normalizeValue(selectedUpdate.touchpointType),
    );

    return exactMatches.length > 0 ? exactMatches : detailItems;
  };

  const parseDateString = (dateStr: any) => {
    if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return null;
    }
    const [month, day, year] = dateStr.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  };

  useEffect(() => {
    const fetchOpportunityUpdates = async () => {
      try {
        const response = await axios.get(listApiUrl, {
          headers: getAuthHeaders(),
        });

        const data = response.data;
        const company = localStorage.getItem("company")?.toLowerCase();

        if (!Array.isArray(data)) {
          setUpdates([]);
        } else {
          const filteredData = company
            ? data.filter((member: any) =>
                (member.REFERRAL_PARTNER || member.COMPANY || "")
                  .toLowerCase()
                  .includes(company),
              )
            : data;

          const sortedData = filteredData.sort((a: any, b: any) =>
            (a.COMPANY || "").localeCompare(b.COMPANY || ""),
          );

          const transformed = sortedData.map((member: any) => ({
            entityId: getOpportunityEntityId(member),
            companyName: member.COMPANY || member.company_name || "",
            opportunity: member.OPPORTUNITY || member.opportunity || "",
            salesPartner:
              member.SALES_REPRESENTATIVE || member.sales_partner || "",
            touchpointDate:
              member.TOUCHPOINT_DATE || member.touchpoint_date || "",
            touchpointType:
              member.TOUCHPOINT_TYPE || member.touchpoint_type || "",
            touchpointTitle:
              member.TOUCHPOINT_SUBJECT || member.touchpoint_title || "",
          }));

          setUpdates(transformed);
        }
      } catch (error) {
        console.error("Error fetching opportunity updates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunityUpdates();
  }, []);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  const filteredupdates = useMemo(() => {
    const sorted = [...updates].filter((m: any) => {
      const matchesSearch = Object.values(m).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase()),
      );
      const matchesDepartment =
        selectedDepartments.length === 0 ||
        selectedDepartments.includes(m.department);
      return matchesSearch && matchesDepartment;
    });

    if (sortConfig !== null) {
      sorted.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof OpportunityUpdateRow];
        let bVal: any = b[sortConfig.key as keyof OpportunityUpdateRow];

        if (sortConfig.key === "touchpointDate") {
          aVal = parseDateString(aVal);
          bVal = parseDateString(bVal);

          if (!aVal && !bVal) return 0;
          if (!aVal) return sortConfig.direction === "asc" ? 1 : -1;
          if (!bVal) return sortConfig.direction === "asc" ? -1 : 1;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [updates, searchTerm, selectedDepartments, sortConfig]);

  const paginatedupdates = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredupdates.slice(start, start + rowsPerPage);
  }, [filteredupdates, currentPage]);

  const totalPages = Math.ceil(filteredupdates.length / rowsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#462EFC] border-t-transparent"></div>
      </div>
    );
  }

  const closeUpdateModal = () => {
    setUpdateModalOpportunity(null);
    setUpdateForm({
      updateTitle: "",
      update: "",
    });

    setUpdateSubmitError("");
    setUpdateSubmitSuccess("");
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!updateModalOpportunity) return;

    setUpdateSubmitting(true);
    setUpdateSubmitError("");
    setUpdateSubmitSuccess("");

    try {
      const payload = {
        username: localStorage.getItem("valid_user_email") || "",
        partnerName: localStorage.getItem("company") || "",
        companyName: updateModalOpportunity.companyName,
        opportunityName: updateModalOpportunity.opportunity,
        salesRep: updateModalOpportunity.salesPartner,
        updateTitle: updateForm.updateTitle,
        update: updateForm.update,
      };

      const response = await axios.post(
        "https://partner.relayhumancloud.com/wp-json/custom/v1/opportunity-update",
        payload,
      );

      if (response.data?.success) {
        setUpdateSubmitSuccess("Opportunity update submitted successfully.");

        setTimeout(() => {
          closeUpdateModal();
        }, 1500);
      }
    } catch (error: any) {
      console.error(
        "Error submitting opportunity update:",
        error.response?.data || error,
      );

      setUpdateSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to submit the opportunity update.",
      );
    } finally {
      setUpdateSubmitting(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm sm:text-base">
          <thead className="text-left text-[#848A95]  bg-[#F9FAFB]">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer"
                onClick={() => handleSort("companyName")}
              >
                Company{" "}
                {sortConfig?.key === "companyName"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
              <th
                className="py-3 px-4  cursor-pointer hidden sm:table-cell"
                onClick={() => handleSort("opportunity")}
              >
                Opportunity Name{" "}
                {sortConfig?.key === "opportunity"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
              <th
                className="py-3 px-4  cursor-pointer hidden sm:table-cell"
                onClick={() => handleSort("salesPartner")}
              >
                Sales Rep{" "}
                {sortConfig?.key === "salesPartner"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
              <th
                className="py-3 px-4  cursor-pointer hidden sm:table-cell"
                onClick={() => handleSort("touchpointDate")}
              >
                Date{" "}
                {sortConfig?.key === "touchpointDate"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
              <th
                className="py-3 px-4  cursor-pointer hidden sm:table-cell"
                onClick={() => handleSort("touchpointType")}
              >
                Touch Type{" "}
                {sortConfig?.key === "touchpointType"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
              <th
                className="py-3 px-4 cursor-pointer hidden sm:table-cell"
                onClick={() => handleSort("touchpointTitle")}
              >
                Title{" "}
                {sortConfig?.key === "touchpointTitle"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
            </tr>
          </thead>

          {/* Desktop */}
          <tbody className="hidden sm:table-row-group">
            {paginatedupdates.map((m: OpportunityUpdateRow, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-4 px-4 text-[#848A95]">{m.companyName}</td>
                <td className="py-4 px-4 text-[#848A95]">{m.opportunity}</td>
                <td className="py-4 px-4 text-[#848A95]">{m.salesPartner}</td>
                <td className="py-4 px-4 text-[#848A95]">{m.touchpointDate}</td>
                <td className="py-4 px-4 text-[#848A95]">{m.touchpointType}</td>
                <td className="py-4 px-4 text-[#848A95] max-w-xs whitespace-normal break-words">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleTitleClick(m)}
                      className="text-left hover:underline focus:outline-none cursor-pointer whitespace-normal break-words"
                    >
                      {m.touchpointTitle || "View content"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setUpdateModalOpportunity(m)}
                      className="shrink-0 px-3 py-1.5 bg-[#3333ff] text-white text-sm rounded-md hover:opacity-90 cursor-pointer"
                    >
                      Add Update
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Mobile */}
          <tbody className="sm:hidden">
            {paginatedupdates.map((m: OpportunityUpdateRow, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-4 px-4 text-[#848A95] ">
                  <div
                    className={`w-full ${rotatedId === idx ? "block" : "hidden"}`}
                  >
                    <div className="flex w-full mb-2">
                      <div className="font-semibold flex-1">Name</div>
                      <div className="flex-1">{m.companyName}</div>
                    </div>
                    <div className="flex w-full mb-2">
                      <div className="font-semibold flex-1">Opportunity</div>
                      <div className="flex-1">{m.opportunity}</div>
                    </div>
                    <div className="flex w-full mb-2">
                      <div className="font-semibold flex-1">Sales Rep</div>
                      <div className="flex-1">{m.salesPartner}</div>
                    </div>
                    <div className="flex w-full mb-2">
                      <div className="font-semibold flex-1">Date</div>
                      <div className="flex-1">{m.touchpointDate}</div>
                    </div>
                    <div className="flex w-full mb-2">
                      <div className="font-semibold flex-1">Touch Type</div>
                      <div className="flex-1 text-[#202328]">
                        {m.touchpointType}
                      </div>
                    </div>
                    <div className="flex w-full mb-2">
                      <div className="font-semibold flex-1">Title</div>
                      <div className="flex flex-col items-left gap-1">
                        <button
                          type="button"
                          onClick={() => handleTitleClick(m)}
                          className="text-left text-[#3333ff] hover:underline focus:outline-none cursor-pointer whitespace-normal break-words"
                        >
                          {m.touchpointTitle || "View content"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setUpdateModalOpportunity(m)}
                          className="shrink-0 px-3 py-1.5 bg-[#141464] text-white text-xs rounded-md hover:opacity-90 cursor-pointer"
                        >
                          Add Update
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold flex justify-between">
                    <div
                      className={` ${rotatedId === idx ? "opacity-0" : "opacity-100"}`}
                    >
                      {m.companyName}
                    </div>
                    <button
                      onClick={() => handleRowToggle(m, idx)}
                      className={`ml-2 w-[24px] h-[24px] focus:outline-none transform transition-transform duration-300 ${rotatedId === idx ? "rotate-180" : "rotate-0"}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="12" fill="#141464" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 10l4 4 4-4"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-[#848A95]">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="space-x-2">
            <button
              className="px-3 py-1 rounded bg-gray-200 text-[#848A95] disabled:opacity-50 cursor-pointer"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 rounded bg-gray-200 text-[#848A95] disabled:opacity-50 cursor-pointer"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedUpdate && (
        <div className="fixed inset-0 bg-black/[0.4] backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] relative overflow-hidden">
            <div className="bg-[#190089] text-white px-6 py-4 rounded-t-xl flex justify-between items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedUpdate.companyName}
                </h2>
                <p className="text-sm text-white/80">
                  {selectedUpdate.touchpointTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                className="text-white text-xl cursor-pointer"
              >
                x
              </button>
            </div>

            <div className="p-6 text-black overflow-y-auto max-h-[calc(90vh-88px)]">
              {detailLoading && (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#462EFC] border-t-transparent"></div>
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="text-red-600 font-medium">{detailError}</div>
              )}

              {!detailLoading &&
                !detailError &&
                getSelectedDetailItems().length === 0 && (
                  <div className="text-[#848A95]">
                    No content found for this company.
                  </div>
                )}

              {!detailLoading &&
                !detailError &&
                getSelectedDetailItems().map((item, index) => (
                  <div key={index} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#848A95]">
                      <div>
                        <span className="font-semibold text-[#141464]">
                          Opportunity:
                        </span>{" "}
                        {item.OPPORTUNITY || selectedUpdate.opportunity}
                      </div>
                      <div>
                        <span className="font-semibold text-[#141464]">
                          Sales Rep:
                        </span>{" "}
                        {item.SALES_REPRESENTATIVE ||
                          selectedUpdate.salesPartner}
                      </div>
                      <div>
                        <span className="font-semibold text-[#141464]">
                          Date:
                        </span>{" "}
                        {item.TOUCHPOINT_DATE || selectedUpdate.touchpointDate}
                      </div>
                      <div>
                        <span className="font-semibold text-[#141464]">
                          Touch Type:
                        </span>{" "}
                        {item.TOUCHPOINT_TYPE || selectedUpdate.touchpointType}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-[#141464]">
                          Subject:
                        </span>{" "}
                        {item.TOUCHPOINT_SUBJECT ||
                          selectedUpdate.touchpointTitle}
                      </div>
                    </div>

                    <iframe
                      title={`Opportunity content ${index + 1}`}
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      srcDoc={getOpportunityDescriptionSrcDoc(item.DESCRIPTION)}
                      className="w-full h-[520px] border rounded-lg bg-white"
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {updateModalOpportunity && (
        <div className="fixed inset-0 bg-black/[0.4] backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="bg-[#190089] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">
                  Add Opportunity Update
                </h2>
                <p className="text-sm text-white/80">
                  {updateModalOpportunity.opportunity}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUpdateModal}
                className="text-white text-xl cursor-pointer"
              >
                x
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-5">

              <div>
                <label className="block text-sm font-semibold text-[#141464] mb-2">
                  Update Title
                </label>

                <input
                  type="text"
                  required
                  value={updateForm.updateTitle}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      updateTitle: e.target.value,
                    }))
                  }
                  placeholder="Enter update title"
                  className="w-full border border-gray-300 text-[#202328] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#462EFC]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#141464] mb-2">
                  Update
                </label>

                <textarea
                  required
                  rows={6}
                  value={updateForm.update}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      update: e.target.value,
                    }))
                  }
                  placeholder="Enter opportunity update"
                  className="w-full border border-gray-300 text-[#202328] rounded-lg px-4 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-[#462EFC]"
                />
              </div>

              {updateSubmitError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {updateSubmitError}
                </div>
              )}

              {updateSubmitSuccess && (
                <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  {updateSubmitSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeUpdateModal}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updateSubmitting}
                  className="px-5 py-2.5 bg-[#141464] text-white rounded-lg hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateSubmitting ? "Submitting..." : "Submit Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
