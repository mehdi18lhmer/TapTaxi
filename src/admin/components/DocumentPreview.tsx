// Stand-in for the uploaded photo of a document. Deliberately generic and stamped
// "SPÉCIMEN": the demo never stores or shows real identity documents.
import type { Driver, DriverDocument } from "../lib/types";
import { docTitle } from "../lib/labels";
import { initials } from "../lib/format";

export function DocumentPreview({
  doc,
  driver,
}: {
  doc: DriverDocument;
  driver: Driver;
}) {
  const blurred = doc.rejectionReason?.includes("flou");
  const lines = Object.entries(doc.fields);
  return (
    <svg
      viewBox="0 0 340 214"
      className="doc-preview"
      role="img"
      aria-label={`Aperçu de démonstration : ${docTitle[doc.type]}`}
    >
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      <g filter={blurred ? "url(#blur)" : undefined}>
        <rect
          x="1"
          y="1"
          width="338"
          height="212"
          rx="14"
          fill="#FBFAF7"
          stroke="#E2E0D8"
        />
        <rect
          x="1"
          y="1"
          width="338"
          height="38"
          rx="14"
          fill={doc.type === "vehicle" ? "#2F3B4C" : "#3B5F4A"}
        />
        <rect
          x="1"
          y="26"
          width="338"
          height="13"
          fill={doc.type === "vehicle" ? "#2F3B4C" : "#3B5F4A"}
        />
        <text
          x="18"
          y="25"
          fill="#fff"
          fontSize="13"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {docTitle[doc.type].toUpperCase()}
        </text>
        {doc.type === "photo" ? (
          <g>
            <circle cx="170" cy="112" r="46" fill="#E9E5DA" />
            <text
              x="170"
              y="124"
              textAnchor="middle"
              fontSize="34"
              fontWeight="700"
              fill="#8A8678"
              fontFamily="Space Grotesk, sans-serif"
            >
              {initials(driver.name)}
            </text>
            <text
              x="170"
              y="190"
              textAnchor="middle"
              fontSize="11"
              fill="#6F6C62"
              fontFamily="Inter, sans-serif"
            >
              Photo de profil · fond clair, visage visible
            </text>
          </g>
        ) : (
          <g fontFamily="Inter, sans-serif">
            {doc.type !== "vehicle" && (
              <g>
                <rect
                  x="18"
                  y="56"
                  width="74"
                  height="92"
                  rx="8"
                  fill="#E9E5DA"
                />
                <text
                  x="55"
                  y="110"
                  textAnchor="middle"
                  fontSize="22"
                  fontWeight="700"
                  fill="#8A8678"
                  fontFamily="Space Grotesk, sans-serif"
                >
                  {initials(driver.name)}
                </text>
              </g>
            )}
            {lines.map(([label, value], i) => {
              const x = doc.type === "vehicle" ? 18 : 108;
              return (
                <g key={label}>
                  <text
                    x={x}
                    y={66 + i * 38}
                    fontSize="9"
                    fill="#8A8678"
                    letterSpacing="0.6"
                  >
                    {label.toUpperCase()}
                  </text>
                  <text
                    x={x}
                    y={82 + i * 38}
                    fontSize="13"
                    fontWeight="600"
                    fill="#1D1D1B"
                  >
                    {value}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </g>
      <text
        x="170"
        y="128"
        textAnchor="middle"
        fontSize="30"
        fontWeight="800"
        fill="#D91E24"
        opacity="0.13"
        transform="rotate(-18 170 112)"
        fontFamily="Inter, sans-serif"
      >
        SPÉCIMEN · DÉMO
      </text>
    </svg>
  );
}
