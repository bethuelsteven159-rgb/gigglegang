import { sb } from "./config/supabase.js";

let topVendors = [];

function getContainer() {
  return document.getElementById("topVendorsPageContainer");
}

function renderMessage(message, type = "empty") {
  const container = getContainer();

  if (!container) return;

  container.innerHTML = `
    <p class="top-vendors-empty ${type}">
      ${message}
    </p>
  `;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchReviews() {
  const venIdResponse = await sb
    .from("reviews")
    .select("ven_id, rating");

  if (!venIdResponse.error) {
    return {
      rows: venIdResponse.data || [],
      vendorColumn: "ven_id"
    };
  }

  console.warn("Could not use reviews.ven_id:", venIdResponse.error);

  const vendorIdResponse = await sb
    .from("reviews")
    .select("vendor_id, rating");

  if (!vendorIdResponse.error) {
    return {
      rows: vendorIdResponse.data || [],
      vendorColumn: "vendor_id"
    };
  }

  console.error("Could not use reviews.vendor_id:", vendorIdResponse.error);

  throw vendorIdResponse.error;
}

async function fetchVendorsById(vendorIds) {
  if (!vendorIds.length) return {};

  const idResponse = await sb
    .from("vendors")
    .select("id, username")
    .in("id", vendorIds);

  if (!idResponse.error) {
    const vendorNames = {};

    (idResponse.data || []).forEach((vendor) => {
      vendorNames[vendor.id] = vendor.username || `Vendor ${vendor.id}`;
    });

    return vendorNames;
  }

  console.warn("Could not use vendors.id:", idResponse.error);

  const vendorIdResponse = await sb
    .from("vendors")
    .select("vendor_id, username")
    .in("vendor_id", vendorIds);

  if (!vendorIdResponse.error) {
    const vendorNames = {};

    (vendorIdResponse.data || []).forEach((vendor) => {
      vendorNames[vendor.vendor_id] =
        vendor.username || `Vendor ${vendor.vendor_id}`;
    });

    return vendorNames;
  }

  console.warn("Could not use vendors.vendor_id:", vendorIdResponse.error);

  return {};
}

function renderTopVendors(vendors) {
  const container = getContainer();

  if (!container) return;

  container.innerHTML = vendors
    .map((vendor, index) => {
      let medal = "🥉";

      if (index === 0) medal = "🥇";
      if (index === 1) medal = "🥈";

      return `
        <div class="top-vendor-card top-vendor-large">

          <div class="top-vendor-rank">
            ${medal}
          </div>

          <div class="top-vendor-info">

            <div class="top-vendor-name">
              #${index + 1} — ${escapeHTML(vendor.username)}
            </div>

            <div class="top-vendor-rating">
              ⭐ ${vendor.averageRating.toFixed(1)}
              <br>
              ${vendor.reviewCount}
              review${vendor.reviewCount === 1 ? "" : "s"}
            </div>

          </div>

        </div>
      `;
    })
    .join("");
}

export async function loadTopVendorsPage() {
  const container = getContainer();

  if (!container) {
    console.error("Missing #topVendorsPageContainer in HTML.");
    return;
  }

  renderMessage("Loading vendor rankings...");

  try {
    const { rows, vendorColumn } = await fetchReviews();

    const validReviews = rows.filter((review) => {
      return review[vendorColumn] && Number(review.rating || 0) > 0;
    });

    if (!validReviews.length) {
      renderMessage("No vendor ratings available yet.");
      return;
    }

    const vendorIds = [
      ...new Set(validReviews.map((review) => review[vendorColumn]))
    ];

    const vendorNames = await fetchVendorsById(vendorIds);

    const vendorMap = {};

    validReviews.forEach((review) => {
      const vendorId = review[vendorColumn];

      if (!vendorMap[vendorId]) {
        vendorMap[vendorId] = {
          vendor_id: vendorId,
          username: vendorNames[vendorId] || `Vendor ${vendorId}`,
          totalRating: 0,
          reviewCount: 0
        };
      }

      vendorMap[vendorId].totalRating += Number(review.rating || 0);
      vendorMap[vendorId].reviewCount += 1;
    });

    topVendors = Object.values(vendorMap)
      .map((vendor) => {
        return {
          ...vendor,
          averageRating: vendor.totalRating / vendor.reviewCount
        };
      })
      .sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }

        return b.reviewCount - a.reviewCount;
      })
      .slice(0, 3);

    renderTopVendors(topVendors);
  } catch (error) {
    console.error("Top vendors page error:", error);

    renderMessage(
      "Failed to load vendor rankings. Check that the reviews table has ven_id or vendor_id, and rating.",
      "error"
    );
  }
}

window.loadTopVendorsPage = loadTopVendorsPage;

document.addEventListener("DOMContentLoaded", loadTopVendorsPage);
