import { sb } from "./config/supabase.js";

let topVendors = [];

async function fetchReviews() {
  let response = await sb
    .from("reviews")
    .select("ven_id, rating")
    .not("rating", "is", null);

  if (!response.error) {
    return {
      rows: response.data || [],
      vendorColumn: "ven_id"
    };
  }

  console.warn("ven_id failed. Trying vendor_id fallback:", response.error);

  response = await sb
    .from("reviews")
    .select("vendor_id, rating")
    .not("rating", "is", null);

  if (response.error) {
    throw response.error;
  }

  return {
    rows: response.data || [],
    vendorColumn: "vendor_id"
  };
}

async function fetchVendors(vendorIds) {
  if (!vendorIds.length) return {};

  const { data, error } = await sb
    .from("vendors")
    .select("id, username")
    .in("id", vendorIds);

  if (error) {
    console.warn("Could not load vendor names:", error);
    return {};
  }

  const vendorNames = {};

  (data || []).forEach((vendor) => {
    vendorNames[vendor.id] = vendor.username || "Unknown Vendor";
  });

  return vendorNames;
}

function renderEmpty(container, message) {
  container.innerHTML = `
    <p class="top-vendors-empty">
      ${message}
    </p>
  `;
}

export async function loadTopVendorsPage() {
  const container = document.getElementById("topVendorsPageContainer");

  if (!container) return;

  container.innerHTML = `
    <p class="top-vendors-empty">
      Loading vendor rankings...
    </p>
  `;

  try {
    const { rows, vendorColumn } = await fetchReviews();

    const validReviews = rows.filter((review) => {
      return review[vendorColumn] && Number(review.rating || 0) > 0;
    });

    if (!validReviews.length) {
      renderEmpty(container, "No vendor ratings available yet.");
      return;
    }

    const vendorIds = [
      ...new Set(validReviews.map((review) => review[vendorColumn]))
    ];

    const vendorNames = await fetchVendors(vendorIds);

    const vendorMap = {};

    validReviews.forEach((review) => {
      const vendorId = review[vendorColumn];

      if (!vendorMap[vendorId]) {
        vendorMap[vendorId] = {
          vendor_id: vendorId,
          username: vendorNames[vendorId] || "Unknown Vendor",
          totalRating: 0,
          reviewCount: 0
        };
      }

      vendorMap[vendorId].totalRating += Number(review.rating || 0);
      vendorMap[vendorId].reviewCount += 1;
    });

    const rankedVendors = Object.values(vendorMap)
      .map((vendor) => {
        const averageRating = vendor.totalRating / vendor.reviewCount;

        return {
          ...vendor,
          averageRating
        };
      })
      .sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }

        return b.reviewCount - a.reviewCount;
      })
      .slice(0, 3);

    topVendors = rankedVendors;

    container.innerHTML = topVendors
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
                #${index + 1} — ${vendor.username}
              </div>

              <div class="top-vendor-rating">
                ⭐ ${vendor.averageRating.toFixed(1)}
                <br>
                ${vendor.reviewCount} review${vendor.reviewCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Top vendors page error:", error);

    renderEmpty(container, "Failed to load vendor rankings.");
  }
}

window.loadTopVendorsPage = loadTopVendorsPage;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadTopVendorsPage);
} else {
  loadTopVendorsPage();
}
