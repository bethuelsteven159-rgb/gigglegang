import { sb } from './config/supabase.js';

let topVendors = [];

/* ======================================================
   LOAD TOP VENDORS
====================================================== */

async function loadTopVendorsPage() {

  const container =
    document.getElementById(
      'topVendorsPageContainer'
    );

  if (!container) {
    return;
  }

  const { data, error } = await sb
    .from('reviews')
    .select(`
      vendor_id,
      rating,
      vendors (
        username
      )
    `);

  if (error) {

    console.error(
      'Top vendors page error:',
      error
    );

    container.innerHTML = `
      <p class="top-vendors-empty">
        Failed to load vendor rankings.
      </p>
    `;

    return;
  }

  if (!data || !data.length) {

    container.innerHTML = `
      <p class="top-vendors-empty">
        No vendor ratings available yet.
      </p>
    `;

    return;
  }

  /*
    GROUP REVIEWS BY VENDOR
  */

  const vendorMap = {};

  data.forEach(review => {

    const vendorId = review.vendor_id;

    if (!vendorMap[vendorId]) {

      vendorMap[vendorId] = {

        vendor_id: vendorId,

        username:
          review.vendors?.username ||
          'Unknown Vendor',

        totalRating: 0,

        reviewCount: 0
      };
    }

    vendorMap[vendorId].totalRating +=
      Number(review.rating || 0);

    vendorMap[vendorId].reviewCount += 1;
  });

  /*
    CALCULATE AVERAGES
  */

  const rankedVendors =
    Object.values(vendorMap)

      .map(vendor => {

        const averageRating =
          vendor.totalRating /
          vendor.reviewCount;

        return {
          ...vendor,
          averageRating
        };
      })

      .sort(
        (a, b) =>
          b.averageRating - a.averageRating
      )

      .slice(0, 3);

  topVendors = rankedVendors;

  /*
    RENDER
  */

  container.innerHTML =
    topVendors.map((vendor, index) => {

      let medal = '🥉';

      if (index === 0) {
        medal = '🥇';
      }

      if (index === 1) {
        medal = '🥈';
      }

      return `
        <div class="top-vendor-card top-vendor-large">

          <div class="top-vendor-rank">
            ${medal}
          </div>

          <div class="top-vendor-info">

            <div class="top-vendor-name">

              #${index + 1}

              —

              ${vendor.username}

            </div>

            <div class="top-vendor-rating">

              ⭐
              ${vendor.averageRating.toFixed(1)}

              <br>

              ${vendor.reviewCount}
              review${vendor.reviewCount === 1 ? '' : 's'}

            </div>

          </div>

        </div>
      `;
    }).join('');
}

/* ======================================================
   INIT
====================================================== */

loadTopVendorsPage();
