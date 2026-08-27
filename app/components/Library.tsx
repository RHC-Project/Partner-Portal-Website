import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import clsx from "clsx"; // Optional: for className switching

export default function Library() {
  const [libraries, setLibraries] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(true);
  const [rotated, setRotated] = useState(false);

  const handleActivewToggle = (tab: string) => {
    if (activeTab !== tab) {
      setActiveTab(tab); // Expand the clicked tab
    }
  };

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const token = localStorage.getItem("token_partner");
        const userEmail = localStorage.getItem("valid_user_email");
        const company = localStorage.getItem("company");

        const headers = {
          Authorization: `Bearer ${token}`,
          authemail: `Bearer ${userEmail}`,
          company: `${company}`,
        };

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}wp-json/custom/v1/library`,
          { headers },
        );

        if (response.data && typeof response.data === "object") {
          const keys = Object.keys(response.data);
          console.log(response.data);
          setLibraries(response.data);
          setActiveTab(keys[0]); // Set first tab as default
        } else {
          setLibraries({});
        }
      } catch (error) {
        console.error("Error fetching library data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLibraries();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  function decodeHtmlEntities(text: string) {
    if (!text) return text;
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
  }

  // Joins base URL and path safely, stripping any existing fragment from the path
  // so we don't end up with double slashes or two "#" fragments concatenated.
  function joinUrl(base: string, path: string) {
    if (!base || !path) return "";
    const cleanPath = path.split("#")[0];
    return `${base.replace(/\/+$/, "")}/${cleanPath.replace(/^\/+/, "")}`;
  }

  // Determines file extension from the path (ignoring any query/fragment).
  function getFileExtension(path: string) {
    if (!path) return "";
    const clean = path.split("#")[0].split("?")[0];
    const match = clean.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : "";
  }

  function getEmbedUrl(item: any) {
    const baseUrl = joinUrl(
      process.env.NEXT_PUBLIC_API_URL || "",
      item.embed_data,
    );

    const ext = getFileExtension(item.embed_data);

    if (ext === "pdf") {
      return {
        url: `${baseUrl}#page=1&view=FitH`,
        type: "pdf" as const,
      };
    }

    if (ext === "mp4" || ext === "webm" || ext === "ogg") {
      return {
        url: baseUrl,
        type: "video" as const,
      };
    }

    return {
      url: baseUrl,
      type: "unsupported" as const,
    };
  }

  const openDocument = async (documentId: number) => {
    try {
      const token = localStorage.getItem("token_partner");
      const userEmail = localStorage.getItem("valid_user_email");
      const company = localStorage.getItem("company");

      if (!token || !userEmail) {
        window.location.href = "/login";
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}wp-json/custom/v1/document-url?id=${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            authemail: `Bearer ${userEmail}`,
            company: company || "",
          },
        },
      );

      window.open(response.data.url, "_blank");
    } catch (error) {
      console.error("Unable to open document", error);
      alert("Unable to open document.");
    }
  };

  return (
    <div className="sm:p-4">
      {/* Tabs */}
      <div className="sm:flex space-x-4 mb-6 sm:justify-between justify-center hidden">
        {Object.keys(libraries).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "pb-2 font-medium",
              activeTab === tab
                ? "flex items-center gap-2 pb-2 text-sm sm:text-base border-b-2 transition-colors cursor-pointer border-[#462EFC] text-[#462EFC] font-semibold"
                : "flex items-center gap-2 pb-2 text-sm sm:text-base border-b-2 transition-colors cursor-pointer border-transparent text-[#8984AF] font-semibold",
            )}
          >
            {tab == "" ? "Other" : tab}
          </button>
        ))}
      </div>

      <div className="sm:hidden flex mb-4">
        <div className="font-semibold flex-1 text-[#848A95]">{activeTab}</div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4  sm:gap-6 gap-2">
        {libraries[activeTab]?.map((item: any) => {
          const { url: embedUrl, type: embedType } = getEmbedUrl(item);

          return (
            <a
              key={item.ID}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openDocument(item.ID);
              }}
              className="bg-white overflow-hidden transition"
            >
              <div className="w-full sm:h-64 overflow-hidden flex items-center justify-center bg-gray-50">
                {embedType === "pdf" && (
                  <embed
                    src={embedUrl}
                    type="application/pdf"
                    className="w-full h-full"
                  />
                )}

                {embedType === "video" && (
                  <video
                    src={embedUrl}
                    poster="https://www.relayhumancloud.com/wp-content/uploads/2026/08/video-thumbnail.png"
                    className="w-full h-full object-contain pointer-events-none bg-black"
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}

                {embedType === "unsupported" && (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <span className="text-sm text-gray-500">
                      Preview not available
                    </span>

                    <span className="text-xs text-gray-400 mt-1">
                      Click to open file
                    </span>
                  </div>
                )}
              </div>
              <div className="sm:p-4 p-1">
                <h3 className="text-blue-700 font-semibold sm:text-md text-xs">
                  {decodeHtmlEntities(item.post_title)}
                </h3>
              </div>
            </a>
          );
        })}
      </div>
      {/* Arrow up and down */}
      <div className="sm:hidden flex mt-4 mb-4 px-2 justify-end">
        <button
          className={`ml-2 w-[24px] h-[24px] focus:outline-none transform transition-transform sm:hidden duration-300 rotate-180`}
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

      {Object.keys(libraries)
        .filter((tab) => tab !== activeTab) // hide active tab completely
        .map((tab, idx, arr) => {
          const isFirst = idx === 0;
          const isLast = idx === arr.length - 1;

          return (
            <div
              key={tab}
              className={`py-4 px-2 text-[#848A95] font-semibold sm:hidden flex justify-between
          ${isFirst ? "border-t border-b" : ""}
          ${!isFirst && !isLast ? "border-b" : ""}
          ${isLast ? "border-0" : ""}
        `}
            >
              {tab === "" ? "Other" : tab}

              <button
                onClick={() => handleActivewToggle(tab)}
                className="ml-2 w-[24px] h-[24px] mb-4 focus:outline-none transform transition-transform sm:hidden duration-300"
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
          );
        })}
    </div>
  );
}
